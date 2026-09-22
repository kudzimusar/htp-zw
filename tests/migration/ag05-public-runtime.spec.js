const { test, expect } = require('@playwright/test');
const {
  sanitizeHtml,
  structuredGraph,
  renderStoryPage,
  renderSitemap,
  renderFeed,
  renderAdPreview
} = require('../../lib/ag05-public-runtime');

const publicDoc={
  source_id:'33190',
  source_type:'post',
  source_url:'https://healthtimes.co.zw/2026/09/18/example/',
  handling:'preserve_directly',
  http_status:200,
  title:'Source SEO Title',
  story_title:'Authoritative Story Title',
  description:'Source description.',
  canonical_url:'https://healthtimes.co.zw/2026/09/18/example/',
  robots:'index,follow,max-image-preview:large',
  open_graph_title:'Authoritative Story Title',
  open_graph_description:'Source description.',
  schema_type:'NewsArticle',
  published_at:'2026-09-18T17:04:57Z',
  modified_at:'2026-09-18T18:04:57Z',
  author:{name:'Michael Gwarisa',slug:'mike-gwarisa',bio:null},
  section:{name:'Health News',slug:'health-news'},
  access_policy:'public',
  body_html:'<p>Verified body.</p><script>alert(1)</script>',
  standfirst:'Verified standfirst.'
};

test('server-rendered migrated story emits initial HTML SEO and structured data',()=>{
  const html=renderStoryPage(publicDoc,{supabaseUrl:'https://example.supabase.co'});
  expect(html).toContain('<title>Source SEO Title</title>');
  expect(html).toContain('<link rel="canonical" href="https://healthtimes.co.zw/2026/09/18/example/">');
  expect(html).toContain('property="og:title" content="Authoritative Story Title"');
  expect(html).toContain('"@type":"NewsArticle"');
  expect(html).toContain('"@type":"Person"');
  expect(html).toContain('"@type":"BreadcrumbList"');
  expect(html).toContain('Verified body.');
  expect(html).not.toContain('<script>alert(1)</script>');
});

test('premium-marker review preserves indexable authority metadata without exposing article body',()=>{
  const html=renderStoryPage({...publicDoc,access_policy:'premium_marker_review',body_html:'<p>Protected full body.</p>'});
  expect(html).toContain('<meta name="robots" content="index,follow,max-image-preview:large">');
  expect(html).toContain('Article access is being verified.');
  expect(html).not.toContain('Protected full body.');
});

test('structured data does not fabricate absent author or section',()=>{
  const graph=structuredGraph({...publicDoc,author:null,section:null},'');
  expect(graph['@graph'].some(row=>row['@type']==='Person')).toBe(false);
  const article=graph['@graph'].find(row=>row['@type']==='NewsArticle');
  expect(article).not.toHaveProperty('author');
  expect(article).not.toHaveProperty('articleSection');
});

test('HTML sanitizer removes executable source content',()=>{
  const html=sanitizeHtml('<p onclick="bad()">Safe</p><script>bad()</script><a href="javascript:bad()">x</a>');
  expect(html).toContain('Safe');
  expect(html).not.toContain('onclick');
  expect(html).not.toContain('<script>');
  expect(html.toLowerCase()).not.toContain('javascript:');
});

test('sitemap renderer emits only supplied canonical rows',()=>{
  const xml=renderSitemap([
    {canonical_url:'https://healthtimes.co.zw/a/',modified_at:'2026-09-18T00:00:00Z'},
    {canonical_url:'https://healthtimes.co.zw/b/',modified_at:null}
  ]);
  expect((xml.match(/<url>/g)||[])).toHaveLength(2);
  expect(xml).toContain('<loc>https://healthtimes.co.zw/a/</loc>');
  expect(xml).toContain('<lastmod>2026-09-18</lastmod>');
});

test('RSS renderer contains authority fields but no fabricated metrics',()=>{
  const xml=renderFeed([{
    title:'Story',
    canonical_url:'https://healthtimes.co.zw/story/',
    published_at:'2026-09-18T00:00:00Z',
    author_name:'Michael Gwarisa',
    description:'Summary'
  }]);
  expect(xml).toContain('<title>Story</title>');
  expect(xml).toContain('Michael Gwarisa');
  expect(xml).not.toMatch(/impressions|revenue|clicks/i);
});

test('HOSPAZ preview preserves unknown commercial fields and has no invented click target',()=>{
  const html=renderAdPreview({
    advertiser:'HOSPAZ',
    placement_key:'hospaz-header-direct',
    current_source_attachment_id:'33005',
    current_source_url:'https://healthtimes.co.zw/wp-content/uploads/source.jpeg',
    destination_url_state:'UNKNOWN',
    schedule_state:'UNKNOWN',
    placement_conditions_state:'UNKNOWN'
  });
  expect(html).toContain('HOSPAZ');
  expect(html).toContain('UNKNOWN');
  expect(html).toContain('No click target or schedule is invented');
  expect(html).not.toContain('<a ');
});
