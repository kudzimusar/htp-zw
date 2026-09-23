#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildStoryCapability,
  buildContextCapability,
  routeDecision,
  buildHospazCapability,
  renderFeed
} = require('../../lib/ag05-capability');

const EXPECTED_PUBLIC_OBJECTS = 5786;
const EXPECTED_FEED_ITEMS = 50;
const EXPECTED_PROJECT_REF = 'gcdohgbmqhqwydgaxrcr';

const directPath = '/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/';
const premiumPath = '/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/';
const aliasPath = '/policy-capture-at-cop11-what-it-signals-for-global-health-governance/';
const explicit404Path = '/2017/04/04/gwinji-appeals-funding-health-sector/';
const categoryPath = '/category/health_news/';
const tagPath = '/tag/cpu/';
const authorPath = '/author/mike-gwarisa/';
const unverifiableAuthorAliasPath = '/author/michael-gwarisa/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(text, needle) {
  return String(text || '').split(needle).length - 1;
}

async function main() {
  const base = String(process.env.HEALTHTIMES_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.HEALTHTIMES_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  assert(base.includes(EXPECTED_PROJECT_REF), 'Refusing any project other than HealthTimes Staging ' + EXPECTED_PROJECT_REF + '.');
  assert(key, 'Missing browser-safe HealthTimes Staging publishable key.');

  async function rpc(name, args = {}) {
    const response = await fetch(base + '/rest/v1/rpc/' + encodeURIComponent(name), {
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
      throw new Error(name + ' read-only RPC failed: HTTP ' + response.status);
    }
    return data;
  }

  const [
    directResolution,
    premiumResolution,
    aliasResolution,
    explicit404Resolution,
    directDoc,
    premiumDoc,
    categoryDoc,
    tagDoc,
    authorDoc,
    unverifiableAuthorAlias,
    sitemapXml,
    feedRows,
    hospaz
  ] = await Promise.all([
    rpc('ag05_resolve_public_path', { p_path: directPath }),
    rpc('ag05_resolve_public_path', { p_path: premiumPath }),
    rpc('ag05_resolve_public_path', { p_path: aliasPath }),
    rpc('ag05_resolve_public_path', { p_path: explicit404Path }),
    rpc('ag05_public_story_document', { p_path: directPath }),
    rpc('ag05_public_story_document', { p_path: premiumPath }),
    rpc('ag05_public_context_document', { p_path: categoryPath }),
    rpc('ag05_public_context_document', { p_path: tagPath }),
    rpc('ag05_public_context_document', { p_path: authorPath }),
    rpc('ag05_public_context_document', { p_path: unverifiableAuthorAliasPath }),
    rpc('ag05_public_sitemap_xml', {}),
    rpc('ag05_public_feed_rows', { p_limit: EXPECTED_FEED_ITEMS }),
    rpc('ag05_hospaz_direct_ad_preview', {})
  ]);

  const directRoute = routeDecision(directResolution);
  const premiumRoute = routeDecision(premiumResolution);
  const aliasRoute = routeDecision(aliasResolution);
  const explicit404Route = routeDecision(explicit404Resolution);
  const direct = buildStoryCapability(directDoc, { supabaseUrl: base });
  const premium = buildStoryCapability(premiumDoc, { supabaseUrl: base });
  const category = buildContextCapability(categoryDoc);
  const tag = buildContextCapability(tagDoc);
  const author = buildContextCapability(authorDoc);
  const ad = buildHospazCapability(hospaz, { supabaseUrl: base });
  const sitemapCount = count(sitemapXml, '<url>');
  const feed = Array.isArray(feedRows) ? feedRows : [];

  assert(directRoute.httpStatus === 200, 'Direct migrated article no longer resolves HTTP 200.');
  assert(direct?.routing?.sourceId === '30154', 'Direct migrated article source identity drifted from 30154.');
  assert(direct?.seo?.canonicalUrl === 'https://healthtimes.co.zw' + directPath, 'Direct canonical URL drifted.');
  assert(direct?.seo?.structuredData?.['@graph']?.some(row => row['@type'] === 'NewsArticle'), 'Direct story lost NewsArticle semantics.');
  assert(direct?.content?.bodyProtected === false, 'Public article unexpectedly became protected.');
  assert(String(direct?.content?.bodyHtml || '').length > 200, 'Public migrated body is unexpectedly absent.');

  assert(premiumRoute.httpStatus === 200, 'Premium-review article no longer resolves HTTP 200.');
  assert(premium?.routing?.sourceId === '33190', 'Premium-review source identity drifted from 33190.');
  assert(premium?.content?.bodyProtected === true, 'Premium-review article no longer fails closed.');
  assert(premium?.content?.bodyHtml === null, 'Premium-review full body leaked into public capability.');

  assert(aliasRoute.httpStatus === 301, 'Accepted historical alias no longer resolves HTTP 301.');
  assert(aliasRoute.targetPath && aliasRoute.targetPath !== '/', 'Accepted alias points to an invalid homepage catch-all.');

  assert(explicit404Route.httpStatus === 404, 'Accepted explicit exception no longer returns 404.');
  assert(explicit404Route.targetPath === null, 'Explicit 404 unexpectedly acquired a target.');

  assert(category?.seo?.robots === 'noindex,follow', 'Category context robots policy drifted.');
  assert(tag?.seo?.robots === 'noindex,follow', 'Tag context robots policy drifted.');
  assert(author?.seo?.robots === 'noindex,follow', 'Author context robots policy drifted.');
  assert(unverifiableAuthorAlias == null, 'Unverifiable historical author alias unexpectedly gained inferred authority.');

  assert(sitemapCount === EXPECTED_PUBLIC_OBJECTS,
    'Accepted sitemap count drift: expected ' + EXPECTED_PUBLIC_OBJECTS + ', observed ' + sitemapCount + '.');
  assert(feed.length === EXPECTED_FEED_ITEMS,
    'Accepted feed count drift: expected ' + EXPECTED_FEED_ITEMS + ', observed ' + feed.length + '.');
  assert(count(renderFeed(feed), '<item>') === EXPECTED_FEED_ITEMS, 'Presentation-neutral feed renderer lost rows.');

  assert(ad?.advertiser === 'HOSPAZ', 'HOSPAZ advertiser provenance is absent.');
  assert(ad?.provenance?.currentSourceAttachmentId === '33005', 'HOSPAZ current source attachment drifted from 33005.');
  assert(String(ad?.creativeUrl || '').includes('/storage/v1/object/public/migrated-media/'),
    'HOSPAZ migrated creative no longer resolves to canonical migrated-media storage.');
  assert(ad?.destination?.state === 'UNKNOWN' && ad?.destination?.url === null,
    'HOSPAZ destination must remain UNKNOWN/null without source evidence.');
  assert(ad?.schedule?.state === 'UNKNOWN' && ad?.schedule?.value === null,
    'HOSPAZ schedule must remain UNKNOWN/null without source evidence.');
  assert(ad?.placementConditions?.state === 'UNKNOWN' && ad?.placementConditions?.value === null,
    'HOSPAZ placement conditions must remain UNKNOWN/null without source evidence.');

  const evidence = {
    phase: 'AG-05 Phase 3 CP5 Capability Recovery',
    verification: 'read-only',
    stagingProjectRef: EXPECTED_PROJECT_REF,
    observedAt: new Date().toISOString(),
    acceptedExpectations: {
      publicObjects: EXPECTED_PUBLIC_OBJECTS,
      feedItems: EXPECTED_FEED_ITEMS
    },
    observed: {
      sitemapUrlCount: sitemapCount,
      feedItemCount: feed.length,
      direct: {
        sourceId: direct.routing.sourceId,
        httpStatus: directRoute.httpStatus,
        canonicalUrl: direct.seo.canonicalUrl,
        bodyProtected: direct.content.bodyProtected
      },
      premiumReview: {
        sourceId: premium.routing.sourceId,
        httpStatus: premiumRoute.httpStatus,
        canonicalUrl: premium.seo.canonicalUrl,
        bodyProtected: premium.content.bodyProtected,
        bodyExposed: premium.content.bodyHtml !== null
      },
      alias: aliasRoute,
      explicit404: explicit404Route,
      contexts: {
        category: { path: category.path, robots: category.seo.robots, disposition: category.routingDisposition },
        tag: { path: tag.path, robots: tag.seo.robots, disposition: tag.routingDisposition },
        author: { path: author.path, robots: author.seo.robots, disposition: author.routingDisposition },
        unverifiableAuthorAlias: unverifiableAuthorAlias == null ? 'NO AUTHORITY / 404' : 'UNEXPECTED DOCUMENT'
      },
      hospaz: {
        advertiser: ad.advertiser,
        placementKey: ad.placementKey,
        currentSourceAttachmentId: ad.provenance.currentSourceAttachmentId,
        creativeUrl: ad.creativeUrl,
        destination: ad.destination,
        schedule: ad.schedule,
        placementConditions: ad.placementConditions
      }
    },
    mutation: {
      database: false,
      storage: false,
      deployment: false,
      production: false
    }
  };

  const outDir = path.resolve('migration-output/ag05-phase3');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'staging-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
}

main().catch(error => {
  console.error('AG-05 Phase 3 read-only verification failed:', error.message);
  process.exit(1);
});
