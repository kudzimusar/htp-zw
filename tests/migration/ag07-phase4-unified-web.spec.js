const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const {
  buildStoryCapability,
  buildContextCapability
} = require('../../lib/ag05-capability');
const { renderCapabilityShell } = require('../../api/web')._internals;

test('Vercel intentionally builds apps/mobile as the root public Reader without /htp-zw dependency', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  expect(config.framework).toBeNull();
  expect(config.outputDirectory).toBe('apps/mobile/dist');
  expect(config.buildCommand).toContain('build:phase4:web');
  expect(config.buildCommand).toContain('HEALTHTIMES_WEB_BASE_URL=');
  expect(config.buildCommand).not.toContain('/htp-zw');
  const catchAll = config.rewrites.at(-1);
  expect(catchAll.source).toBe('/:path*');
  expect(catchAll.destination).toBe('/api/web?path=/:path*');
  expect(config.rewrites.some(row => row.source === '/sitemap.xml' && row.destination.includes('kind=sitemap'))).toBe(true);
  expect(config.rewrites.some(row => row.source === '/feed' && row.destination.includes('kind=feed'))).toBe(true);
});

test('catch-all resolves through CP5 instead of becoming a homepage SPA catch-all and API/staff files remain explicit', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  expect(config.rewrites.some(row => row.destination === '/index.html')).toBe(false);
  expect(config.rewrites.at(-1).destination).toContain('/api/web');
  const prepare = fs.readFileSync('scripts/web/prepare-phase4-vercel.js','utf8');
  for (const name of ['newsroom.html','newsroom.js','newsroom.css','robots.txt']) {
    expect(prepare).toContain(name);
  }
  expect(fs.existsSync('api/newsroom.js')).toBe(true);
  expect(fs.existsSync('api/communications.js')).toBe(true);
});

test('raw story shell exposes CP5 canonical SEO before hydration while keeping apps/mobile shell', () => {
  const shell = '<!doctype html><html><head><title>HealthTimes</title><meta name="description" content="generic"></head><body><div id="root">Universal Reader shell</div><script src="/_expo/static/js/web/app.js"></script></body></html>';
  const capability = buildStoryCapability({
    source_id:'30154',
    source_type:'post',
    source_url:'https://healthtimes.co.zw/2026/02/12/example/',
    handling:'preserve_directly',
    http_status:200,
    title:'Source SEO Title',
    story_title:'Authoritative Story Title',
    description:'Source description.',
    canonical_url:'https://healthtimes.co.zw/2026/02/12/example/',
    robots:'index,follow,max-image-preview:large',
    open_graph_title:'Authoritative Story Title',
    open_graph_description:'Source description.',
    schema_type:'NewsArticle',
    published_at:'2026-02-12T17:04:57Z',
    author:{name:'Michael Gwarisa',slug:'mike-gwarisa'},
    section:{name:'Health News',slug:'health-news'},
    access_policy:'public',
    body_html:'<p>Verified body.</p>'
  }, { supabaseUrl:'https://example.supabase.co' });
  const html = renderCapabilityShell(shell, capability, '/2026/02/12/example/');
  expect(html).toContain('<title>Source SEO Title</title>');
  expect(html).toContain('rel="canonical" href="https://healthtimes.co.zw/2026/02/12/example/"');
  expect(html).toContain('name="robots" content="index,follow,max-image-preview:large"');
  expect(html).toContain('property="og:title" content="Authoritative Story Title"');
  expect(html).toContain('application/ld+json');
  expect(html).toContain('window.__HTP_PHASE4_CAPABILITY__');
  expect(html).toContain('Universal Reader shell');
  expect(html).not.toContain('More context. More accountability. Better health intelligence.');
});

test('Premium-review capability remains body-protected in the injected Reader bootstrap', () => {
  const capability = buildStoryCapability({
    source_id:'33190',
    source_type:'post',
    source_url:'https://healthtimes.co.zw/2026/09/18/premium/',
    handling:'preserve_directly',
    http_status:200,
    title:'Premium Review',
    story_title:'Premium Review',
    description:'Protected review.',
    canonical_url:'https://healthtimes.co.zw/2026/09/18/premium/',
    robots:'index,follow,max-image-preview:large',
    schema_type:'NewsArticle',
    access_policy:'premium_marker_review',
    standfirst:'Protected preview.',
    body_html:'<p>SECRET FULL BODY</p>'
  });
  const html = renderCapabilityShell('<html><head></head><body>Reader</body></html>', capability, '/2026/09/18/premium/');
  expect(capability.content.bodyProtected).toBe(true);
  expect(capability.content.bodyHtml).toBeNull();
  expect(html).not.toContain('SECRET FULL BODY');
  expect(html).toContain('Protected preview.');
});

test('category/tag/author context shell remains noindex and presentation-neutral', () => {
  const capability = buildContextCapability({
    kind:'category',
    slug:'health_news',
    name:'Health News',
    path:'/category/health_news/',
    canonical_url:'https://healthtimes.co.zw/category/health_news/',
    robots:'noindex,follow',
    routing_disposition:'PRESERVE_CONTEXT_NOINDEX',
    items:[]
  });
  const html = renderCapabilityShell('<html><head></head><body>Universal Reader</body></html>', capability, capability.path);
  expect(html).toContain('name="robots" content="noindex,follow"');
  expect(html).toContain('CollectionPage');
  expect(html).toContain('Universal Reader');
});

test('legacy root UI remains preserved but is not the Vercel output directory', () => {
  for (const file of ['index.html','app.js','v21.js','styles.css','v21.css']) expect(fs.existsSync(file)).toBe(true);
  const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  expect(config.outputDirectory).not.toBe('.');
  expect(config.outputDirectory).not.toBe('');
  expect(config.outputDirectory).toBe('apps/mobile/dist');
});

test('root-origin PWA source configuration remains base-path neutral', () => {
  const html = fs.readFileSync('apps/mobile/app/+html.tsx','utf8');
  expect(html).toContain('configuredBaseUrl');
  expect(html).not.toContain('/htp-zw/');
  const config = fs.readFileSync('apps/mobile/app.config.ts','utf8');
  expect(config).toContain('HEALTHTIMES_WEB_BASE_URL');
  expect(config).toContain('webBaseUrl');
  expect(config).toContain('output: "static"');
});
