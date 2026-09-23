#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const webHandler = require('../../api/web');
const publicApi = require('../../api/public');
const { buildStoryCapability } = require('../../lib/ag05-capability');

const EXPECTED_PROJECT_REF = 'gcdohgbmqhqwydgaxrcr';
const directPath = '/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/';
const premiumPath = '/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/';
const aliasPath = '/policy-capture-at-cop11-what-it-signals-for-global-health-governance/';
const aliasTarget = '/2025/12/06/policy-capture-at-cop11-what-it-signals-for-global-health-governance/';
const explicit404Path = '/2017/04/04/gwinji-appeals-funding-health-sector/';
const unknownPath = '/phase4-no-authoritative-healthtimes-route/';
const categoryPath = '/category/health_news/';
const tagPath = '/tag/cpu/';
const authorPath = '/author/mike-gwarisa/';
const port = 4175;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function main() {
  const config = publicApi._internals.config();
  assert(config.url.includes(EXPECTED_PROJECT_REF),
    'Refusing raw HTTP verification outside HealthTimes Staging ' + EXPECTED_PROJECT_REF + '.');
  assert(config.key, 'Missing browser-safe HealthTimes Staging publishable key.');
  assert(fs.existsSync(path.resolve('apps/mobile/dist/+not-found.html')),
    'Universal Reader not-found shell must be built before raw HTTP verification.');

  const directDoc = await publicApi._internals.rpc('ag05_public_story_document', { p_path: directPath });
  const premiumDoc = await publicApi._internals.rpc('ag05_public_story_document', { p_path: premiumPath });
  const directCapability = buildStoryCapability(directDoc, { supabaseUrl: config.url });
  const premiumCapability = buildStoryCapability(premiumDoc, { supabaseUrl: config.url });

  assert(directCapability.routing.sourceId === '30154', 'Representative direct source identity drifted.');
  assert(premiumCapability.routing.sourceId === '33190', 'Representative Premium source identity drifted.');
  assert(premiumCapability.content.bodyProtected === true && premiumCapability.content.bodyHtml === null,
    'Premium-review capability no longer protects the full body.');

  const server = http.createServer((req, res) => {
    const original = new URL(req.url, 'http://127.0.0.1:' + port);
    req.url = '/api/web?path=' + encodeURIComponent(original.pathname);
    void webHandler(req, res);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  const base = 'http://127.0.0.1:' + port;
  async function request(publicPath) {
    const response = await fetch(base + publicPath, { redirect: 'manual' });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    };
  }

  try {
    const direct = await request(directPath);
    assert(direct.status === 200, 'Raw migrated article did not return HTTP 200.');
    assert(direct.headers['x-healthtimes-presentation'] === 'apps/mobile',
      'Raw migrated article is not identified as canonical apps/mobile presentation.');
    assert(direct.headers['x-ag05-source-id'] === '30154', 'Raw migrated article source ID drifted.');
    assert(direct.body.includes('<title>' + escapeAttr(directCapability.seo.title) + '</title>'),
      'Raw migrated article title is not server-visible.');
    assert(direct.body.includes('name="description" content="' + escapeAttr(directCapability.seo.description) + '"'),
      'Raw migrated article description is not server-visible.');
    assert(direct.body.includes('rel="canonical" href="' + escapeAttr(directCapability.seo.canonicalUrl) + '"'),
      'Raw migrated article canonical URL is not server-visible.');
    assert(direct.body.includes('name="robots" content="' + escapeAttr(directCapability.seo.robots) + '"'),
      'Raw migrated article robots metadata is not server-visible.');
    assert(direct.body.includes('property="og:title" content="' + escapeAttr(directCapability.seo.openGraph.title) + '"'),
      'Raw migrated article Open Graph title is not server-visible.');
    assert(direct.body.includes('type="application/ld+json"'),
      'Raw migrated article structured data is not server-visible.');
    assert(direct.body.includes('window.__HTP_PHASE4_CAPABILITY__'),
      'Raw migrated article did not inject the CP5 capability into the universal Reader shell.');
    assert(direct.body.includes('/_expo/static/js/web/'),
      'Raw migrated article is not using the universal Reader web bundle.');
    assert(!direct.body.includes('More context. More accountability. Better health intelligence.'),
      'Legacy root/CP5 presentation leaked into the canonical raw article shell.');

    const alias = await request(aliasPath);
    assert(alias.status === 301, 'Accepted alias no longer returns HTTP 301.');
    assert(alias.headers.location === aliasTarget, 'Accepted alias is not one-hop to the canonical target.');

    const explicit404 = await request(explicit404Path);
    assert(explicit404.status === 404, 'Accepted explicit exception no longer returns HTTP 404.');

    const unknown = await request(unknownPath);
    assert(unknown.status === 404, 'Unknown public route became a non-404 response.');
    assert(!unknown.body.includes('<title>HealthTimes</title>'),
      'Unknown public route fell through to a homepage 200 shell.');

    const contexts = {};
    for (const publicPath of [categoryPath, tagPath, authorPath]) {
      const response = await request(publicPath);
      assert(response.status === 200, publicPath + ' context did not return HTTP 200.');
      assert(response.body.includes('name="robots" content="noindex,follow"'),
        publicPath + ' context lost noindex,follow server-visible metadata.');
      contexts[publicPath] = {
        status: response.status,
        resolution: response.headers['x-ag05-resolution'] || null
      };
    }

    const premium = await request(premiumPath);
    assert(premium.status === 200, 'Premium-review article did not return HTTP 200.');
    assert(premium.body.includes('"bodyProtected":true'), 'Premium-review body protection is absent from raw shell.');
    assert(premium.body.includes('"bodyHtml":null'), 'Premium-review raw shell exposed a non-null body.');

    const evidence = {
      phase: 'AG-07 Phase 4 Unified Web/PWA Serving Architecture',
      verification: 'normal raw HTTP against exact Phase 4 api/web handler with live read-only staging CP5 data',
      stagingProjectRef: EXPECTED_PROJECT_REF,
      observedAt: new Date().toISOString(),
      direct: {
        path: directPath,
        sourceId: direct.headers['x-ag05-source-id'],
        status: direct.status,
        presentation: direct.headers['x-healthtimes-presentation'],
        canonicalUrl: directCapability.seo.canonicalUrl,
        title: directCapability.seo.title,
        description: directCapability.seo.description,
        robots: directCapability.seo.robots,
        openGraphTitle: directCapability.seo.openGraph.title,
        structuredDataServerVisible: true,
        universalReaderBundle: true,
        legacyPresentationCanonical: false
      },
      alias: { path: aliasPath, status: alias.status, location: alias.headers.location },
      explicit404: { path: explicit404Path, status: explicit404.status },
      unknown: { path: unknownPath, status: unknown.status },
      contexts,
      premiumReview: {
        path: premiumPath,
        sourceId: premiumCapability.routing.sourceId,
        status: premium.status,
        bodyProtected: premiumCapability.content.bodyProtected,
        bodyExposed: premiumCapability.content.bodyHtml !== null
      },
      mutation: {
        database: false,
        storage: false,
        production: false,
        primaryStagingAlias: false
      }
    };

    const outDir = path.resolve('migration-output/ag07-phase4');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'http-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error('AG-07 Phase 4 raw HTTP verification failed:', error.message);
  process.exit(1);
});
