'use strict';

const {
  CAPABILITY_VERSION,
  FEED_LIMIT,
  normalizePath,
  routeDecision,
  buildStoryCapability,
  buildContextCapability,
  renderFeed,
  buildHospazCapability
} = require('../lib/ag05-capability');

function config() {
  const url = (process.env.SUPABASE_URL || process.env.HEALTHTIMES_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY ||
    '';
  return { url, key };
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-AG05-Capability-Version', CAPABILITY_VERSION);
}

function send(res, status, body, type, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  setSecurityHeaders(res);
  res.end(body);
}

function sendJson(req, res, status, value, cache = 'no-store') {
  const body = req.method === 'HEAD' ? '' : JSON.stringify(value);
  return send(res, status, body, 'application/json; charset=utf-8', cache);
}

async function rpc(name, args = {}) {
  const { url, key } = config();
  if (!url || !key) {
    const error = new Error('HealthTimes public capability runtime is not configured.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(url + '/rest/v1/rpc/' + encodeURIComponent(name), {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    redirect: 'manual'
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error = new Error('Public capability RPC failed (' + response.status + ')');
    error.status = response.status;
    error.backend = data;
    throw error;
  }
  return data;
}

function requestedPath(url) {
  return normalizePath(url.searchParams.get('path') || '/');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8', 'no-store');
  }

  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  const kind = String(url.searchParams.get('kind') || 'resolve');

  try {
    if (kind === 'sitemap') {
      const xml = await rpc('ag05_public_sitemap_xml', {});
      const body = typeof xml === 'string' ? xml : String(xml || '');
      const count = (body.match(/<url>/g) || []).length;
      res.setHeader('X-AG05-Sitemap-URL-Count', String(count));
      return send(
        res,
        200,
        req.method === 'HEAD' ? '' : body,
        'application/xml; charset=utf-8',
        'public, max-age=300, s-maxage=1800'
      );
    }

    if (kind === 'feed') {
      const rows = await rpc('ag05_public_feed_rows', { p_limit: FEED_LIMIT });
      const list = Array.isArray(rows) ? rows : [];
      res.setHeader('X-AG05-Feed-Item-Count', String(list.length));
      return send(
        res,
        200,
        req.method === 'HEAD' ? '' : renderFeed(list),
        'application/rss+xml; charset=utf-8',
        'public, max-age=120, s-maxage=600'
      );
    }

    if (kind === 'ad') {
      const ad = await rpc('ag05_hospaz_direct_ad_preview', {});
      const capability = buildHospazCapability(ad, { supabaseUrl: config().url });
      return sendJson(req, res, capability ? 200 : 404, capability || {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'direct-ad',
        resolution: 'not-found'
      });
    }

    if (kind !== 'resolve') {
      return sendJson(req, res, 400, {
        capabilityVersion: CAPABILITY_VERSION,
        error: 'unsupported-capability-kind'
      });
    }

    const path = requestedPath(url);

    if (/^\/(category|tag|author)\//i.test(path)) {
      const context = await rpc('ag05_public_context_document', { p_path: path });
      if (!context) {
        res.setHeader('X-AG05-Resolution', 'context_alias_evidence_missing');
        return sendJson(req, res, 404, {
          capabilityVersion: CAPABILITY_VERSION,
          kind: 'route',
          path,
          routing: {
            httpStatus: 404,
            resolution: 'context_alias_evidence_missing',
            targetPath: null
          }
        }, 'public, max-age=60');
      }

      const capability = buildContextCapability(context);
      res.setHeader('X-AG05-Resolution', String(context.routing_disposition || 'context'));
      return sendJson(req, res, 200, capability, 'public, max-age=60, s-maxage=300');
    }

    const resolution = await rpc('ag05_resolve_public_path', { p_path: path });
    const decision = routeDecision(resolution);
    res.setHeader('X-AG05-Resolution', decision.resolution);

    if (decision.httpStatus === 301) {
      res.setHeader('Location', decision.targetPath);
      return sendJson(req, res, 301, {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path,
        routing: decision
      }, 'public, max-age=300, s-maxage=3600');
    }

    if (decision.httpStatus !== 200) {
      return sendJson(req, res, 404, {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path,
        routing: decision
      }, 'public, max-age=60');
    }

    const doc = await rpc('ag05_public_story_document', { p_path: path });
    if (!doc) {
      res.setHeader('X-AG05-Resolution', 'document_missing');
      return sendJson(req, res, 404, {
        capabilityVersion: CAPABILITY_VERSION,
        kind: 'route',
        path,
        routing: {
          httpStatus: 404,
          resolution: 'document_missing',
          targetPath: null
        }
      });
    }

    const capability = buildStoryCapability(doc, { supabaseUrl: config().url });
    res.setHeader('X-AG05-Source-ID', String(doc.source_id || ''));
    return sendJson(req, res, 200, capability, 'public, max-age=60, s-maxage=300');
  } catch (error) {
    const status = Number(error.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return sendJson(req, res, safeStatus, {
      capabilityVersion: CAPABILITY_VERSION,
      error: 'cp5-capability-failed-safely'
    });
  }
};

module.exports._internals = { config, rpc, requestedPath };
