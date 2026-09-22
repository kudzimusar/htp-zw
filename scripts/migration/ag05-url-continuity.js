#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_COUNTS = Object.freeze({ post: 5737, page: 49 });
const EXPECTED_TOTAL = EXPECTED_COUNTS.post + EXPECTED_COUNTS.page;
const ALLOWED_HANDLING = new Set(['PRESERVE_DIRECTLY', '301_REDIRECT', 'ARCHIVE', 'NOINDEX', 'EXCEPTION']);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

function canonicalPath(value) {
  if (!value) return null;
  let pathname = String(value).trim();
  try {
    const parsed = new URL(pathname, 'https://healthtimes.co.zw');
    pathname = parsed.pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith('/')) pathname = '/' + pathname;
  pathname = pathname.replace(/\/+/g, '/');
  if (pathname !== '/' && !pathname.endsWith('/')) pathname += '/';
  return pathname;
}

function canonicalUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value, 'https://healthtimes.co.zw');
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.protocol = 'https:';
    parsed.hostname = 'healthtimes.co.zw';
    parsed.port = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function loadManifest(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(payload) ? payload : payload.records;
}

function validateManifest(records) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(records)) {
    return { ok: false, errors: ['Manifest must be an array or { records: [] }.'], warnings, summary: null };
  }

  const seenUrls = new Set();
  const normalized = records.map((record, index) => {
    const sourceUrl = canonicalUrl(record.source_url);
    const destinationUrl = canonicalUrl(record.destination_url);
    const canonical = canonicalUrl(record.canonical_url);
    const sourceType = String(record.source_object_type || '').toLowerCase();
    const handling = String(record.handling || '').toUpperCase();
    const httpStatus = Number(record.HTTP_status ?? record.http_status ?? 0);
    const verificationStatus = String(record.verification_status || '').toUpperCase();

    if (!sourceUrl) errors.push(`record ${index}: invalid source_url`);
    if (!record.source_object_id) errors.push(`record ${index}: missing source_object_id`);
    if (!['post', 'page'].includes(sourceType)) errors.push(`record ${index}: source_object_type must be post or page`);
    if (!ALLOWED_HANDLING.has(handling)) errors.push(`record ${index}: invalid handling ${handling || '(empty)'}`);
    if (!record.reason) errors.push(`record ${index}: missing reason`);
    if (!verificationStatus) errors.push(`record ${index}: missing verification_status`);

    if (sourceUrl && seenUrls.has(sourceUrl)) errors.push(`record ${index}: duplicate source_url ${sourceUrl}`);
    if (sourceUrl) seenUrls.add(sourceUrl);

    if (handling === 'PRESERVE_DIRECTLY') {
      if (httpStatus !== 200) errors.push(`record ${index}: PRESERVE_DIRECTLY must use HTTP 200`);
      if (!destinationUrl || canonicalPath(destinationUrl) !== canonicalPath(sourceUrl)) {
        errors.push(`record ${index}: PRESERVE_DIRECTLY must keep the legacy path`);
      }
    }

    if (handling === '301_REDIRECT') {
      if (httpStatus !== 301) errors.push(`record ${index}: 301_REDIRECT must use HTTP 301`);
      if (!destinationUrl) errors.push(`record ${index}: 301_REDIRECT requires destination_url`);
      if (sourceUrl && destinationUrl && canonicalPath(sourceUrl) === canonicalPath(destinationUrl)) {
        errors.push(`record ${index}: redirect source and destination are identical`);
      }
      if (destinationUrl && canonicalPath(destinationUrl) === '/' && canonicalPath(sourceUrl) !== '/') {
        errors.push(`record ${index}: catch-all redirect to homepage is prohibited`);
      }
    }

    if (['ARCHIVE', 'NOINDEX', 'EXCEPTION'].includes(handling) && !record.reason) {
      errors.push(`record ${index}: ${handling} requires an explicit reason`);
    }

    if (canonical && canonicalPath(canonical) === '/' && sourceUrl && canonicalPath(sourceUrl) !== '/' && handling !== 'ARCHIVE') {
      errors.push(`record ${index}: non-home object cannot canonicalize to homepage`);
    }

    return {
      ...record,
      source_url: sourceUrl,
      destination_url: destinationUrl,
      canonical_url: canonical,
      source_object_type: sourceType,
      handling,
      HTTP_status: httpStatus,
      verification_status: verificationStatus
    };
  });

  const typeCounts = normalized.reduce((acc, item) => {
    if (item.source_object_type in acc) acc[item.source_object_type] += 1;
    return acc;
  }, { post: 0, page: 0 });

  for (const [type, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (typeCounts[type] !== expected) {
      errors.push(`${type} coverage is ${typeCounts[type]}; expected ${expected}`);
    }
  }
  if (normalized.length !== EXPECTED_TOTAL) {
    errors.push(`public URL coverage is ${normalized.length}; expected ${EXPECTED_TOTAL}`);
  }

  const redirectSources = new Set(
    normalized.filter(item => item.handling === '301_REDIRECT').map(item => canonicalPath(item.source_url))
  );
  for (const item of normalized.filter(item => item.handling === '301_REDIRECT')) {
    const destinationPath = canonicalPath(item.destination_url);
    if (redirectSources.has(destinationPath)) {
      errors.push(`redirect chain detected: ${canonicalPath(item.source_url)} -> ${destinationPath}`);
    }
  }

  const unverified = normalized.filter(item => !['VERIFIED', 'PASS', 'EXCEPTION_VERIFIED'].includes(item.verification_status));
  if (unverified.length) warnings.push(`${unverified.length} URL records are not yet verified`);

  const summary = {
    expected_total: EXPECTED_TOTAL,
    records: normalized.length,
    posts: typeCounts.post,
    pages: typeCounts.page,
    preserve_directly: normalized.filter(item => item.handling === 'PRESERVE_DIRECTLY').length,
    redirects_301: normalized.filter(item => item.handling === '301_REDIRECT').length,
    archive: normalized.filter(item => item.handling === 'ARCHIVE').length,
    noindex: normalized.filter(item => item.handling === 'NOINDEX').length,
    exceptions: normalized.filter(item => item.handling === 'EXCEPTION').length,
    unverified: unverified.length
  };

  return { ok: errors.length === 0, errors, warnings, summary, records: normalized };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildArtifacts(records) {
  const redirects = records
    .filter(item => item.handling === '301_REDIRECT')
    .map(item => ({
      source: canonicalPath(item.source_url),
      destination: canonicalPath(item.destination_url),
      permanent: true,
      source_object_id: String(item.source_object_id)
    }));

  const indexable = records.filter(item =>
    ['PRESERVE_DIRECTLY', '301_REDIRECT'].includes(item.handling) &&
    item.canonical_url &&
    !String(item.robots || '').toLowerCase().includes('noindex')
  );

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...indexable.map(item => `  <url><loc>${xmlEscape(item.canonical_url)}</loc></url>`),
    '</urlset>',
    ''
  ].join('\n');

  return {
    redirects,
    sitemap,
    productionRobots: [
      'User-agent: *',
      'Allow: /',
      'Disallow: /newsroom',
      'Disallow: /newsroom/',
      'Disallow: /api/internal/',
      'Disallow: /internal/',
      'Sitemap: https://healthtimes.co.zw/sitemap.xml',
      ''
    ].join('\n'),
    feedPolicy: {
      source_feed: 'https://healthtimes.co.zw/feed/',
      destination_path: '/feed/',
      handling: 'PRESERVE',
      required_fields: ['title', 'url', 'date', 'author', 'summary_or_policy_permitted_content'],
      status: 'REQUIRES_AG04_IMPORTED_CONTENT'
    }
  };
}

function writeArtifacts(outDir, validation) {
  fs.mkdirSync(outDir, { recursive: true });
  const artifacts = buildArtifacts(validation.records);

  fs.writeFileSync(path.join(outDir, 'ag05-url-manifest.json'), JSON.stringify({
    schema_version: '1.0',
    source_snapshot: 'cp3-2026-09-21',
    expected_public_objects: EXPECTED_TOTAL,
    summary: validation.summary,
    records: validation.records
  }, null, 2) + '\n');

  fs.writeFileSync(path.join(outDir, 'redirect-manifest.json'), JSON.stringify({
    schema_version: '1.0',
    redirects: artifacts.redirects
  }, null, 2) + '\n');

  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), artifacts.sitemap);
  fs.writeFileSync(path.join(outDir, 'robots.production.txt'), artifacts.productionRobots);
  fs.writeFileSync(path.join(outDir, 'rss-feed-policy.json'), JSON.stringify(artifacts.feedPolicy, null, 2) + '\n');
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.manifest) {
    console.error('Usage: node scripts/migration/ag05-url-continuity.js --manifest <AG04-public-url-manifest.json> [--out-dir migration-output/ag05]');
    process.exit(2);
  }

  const records = loadManifest(path.resolve(args.manifest));
  const validation = validateManifest(records);
  if (!validation.ok) {
    console.error(JSON.stringify({
      state: 'AG05_URL_COVERAGE_BLOCKED',
      summary: validation.summary,
      errors: validation.errors,
      warnings: validation.warnings
    }, null, 2));
    process.exit(3);
  }

  const outDir = path.resolve(args['out-dir'] || 'migration-output/ag05');
  writeArtifacts(outDir, validation);
  console.log(JSON.stringify({
    state: validation.summary.unverified === 0 ? 'AG05_URL_COVERAGE_READY' : 'AG05_URL_COVERAGE_REQUIRES_VERIFICATION',
    output_dir: outDir,
    summary: validation.summary,
    warnings: validation.warnings
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  EXPECTED_COUNTS,
  EXPECTED_TOTAL,
  canonicalPath,
  canonicalUrl,
  validateManifest,
  buildArtifacts
};
