'use strict';

const SITE_URL = 'https://healthtimes.co.zw/';
const ORG_ID = SITE_URL + '#organization';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

function stripTags(value) {
  return String(value ?? '').replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function sanitizeHtml(value) {
  return String(value ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[\s\S]*?<\/style>/gi,'')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi,'')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi,'')
    .replace(/\bjavascript\s*:/gi,'');
}

function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g,'\\u003c').replace(/-->/g,'--\\u003e');
}

function storageUrl(supabaseUrl, objectName) {
  if (!supabaseUrl || !objectName) return '';
  const base=String(supabaseUrl).replace(/\/$/,'');
  const key=String(objectName).split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/migrated-media/${key}`;
}

function resolvedImage(doc, supabaseUrl) {
  if (doc?.featured_storage_object) return storageUrl(supabaseUrl,doc.featured_storage_object);
  if (doc?.open_graph_image && !String(doc.open_graph_image).startsWith('/storage/')) return String(doc.open_graph_image);
  return String(doc?.featured_source_url || '');
}

function structuredGraph(doc, image) {
  const canonical=String(doc.canonical_url || doc.source_url || SITE_URL);
  const author=doc.author?.name ? {
    '@type':'Person',
    '@id':`${SITE_URL}author/${encodeURIComponent(doc.author.slug || doc.author.name)}/#person`,
    name:doc.author.name,
    ...(doc.author.bio ? {description:doc.author.bio} : {})
  } : null;
  const article={
    '@type':doc.schema_type === 'Article' ? 'Article' : 'NewsArticle',
    '@id':canonical + '#article',
    headline:doc.story_title || doc.title,
    ...(doc.description ? {description:doc.description} : {}),
    ...(doc.published_at ? {datePublished:doc.published_at} : {}),
    ...(doc.modified_at ? {dateModified:doc.modified_at} : {}),
    ...(author ? {author:{'@id':author['@id']}} : {}),
    publisher:{'@id':ORG_ID},
    ...(image ? {image:[image]} : {}),
    ...(doc.section?.name ? {articleSection:stripTags(doc.section.name)} : {}),
    mainEntityOfPage:{'@type':'WebPage','@id':canonical}
  };
  const crumbs=[
    {'@type':'ListItem',position:1,name:'Home',item:SITE_URL}
  ];
  if(doc.section?.name && doc.section?.slug){
    crumbs.push({'@type':'ListItem',position:crumbs.length+1,name:stripTags(doc.section.name),item:`${SITE_URL}category/${encodeURIComponent(doc.section.slug)}/`});
  }
  crumbs.push({'@type':'ListItem',position:crumbs.length+1,name:doc.story_title || doc.title,item:canonical});
  const graph=[
    {'@type':'Organization','@id':ORG_ID,name:'HealthTimes',url:SITE_URL},
    article,
    ...(author ? [author] : []),
    {'@type':'BreadcrumbList',itemListElement:crumbs}
  ];
  return {'@context':'https://schema.org','@graph':graph};
}

function articleBody(doc) {
  if (doc.body_html) return sanitizeHtml(doc.body_html);
  const preview=doc.standfirst || doc.excerpt || doc.description || '';
  return `<div class="v21-premium-paywall"><span class="premium-pill">Access review</span><h2>Article access is being verified.</h2><p>${esc(preview)}</p><p>This rehearsal preserves the public URL and metadata without exposing body content marked for Premium review.</p></div>`;
}

function renderStoryPage(doc, {supabaseUrl=''}={}) {
  if(!doc) return null;
  const title=doc.title || doc.story_title || 'HealthTimes';
  const description=stripTags(doc.description || doc.standfirst || doc.excerpt || '').slice(0,320);
  const canonical=doc.canonical_url || doc.source_url || SITE_URL;
  const robots=doc.robots || 'index,follow,max-image-preview:large';
  const image=resolvedImage(doc,supabaseUrl);
  const authorName=doc.author?.name || 'HealthTimes';
  const sectionName=stripTags(doc.section?.name || (doc.source_type === 'page' ? 'HealthTimes' : 'Health News'));
  const graph=structuredGraph(doc,image);
  const published=doc.published_at ? new Date(doc.published_at).toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}) : '';
  const updated=doc.modified_at && doc.modified_at !== doc.published_at ? new Date(doc.modified_at).toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}) : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#092b3a">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${esc(robots)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="HealthTimes">
  <meta property="og:title" content="${esc(doc.open_graph_title || title)}">
  <meta property="og:description" content="${esc(stripTags(doc.open_graph_description || description))}">
  <meta property="og:url" content="${esc(canonical)}">
  ${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/v21.css">
  <link rel="stylesheet" href="/v21-fixes.css">
  <link rel="stylesheet" href="/reader.css">
  <link rel="stylesheet" href="/quality-pass.css">
  <script type="application/ld+json">${jsonForScript(graph)}</script>
</head>
<body data-page="migrated-article">
  <a class="skip-link" href="#main-content">Skip to article</a>
  <header class="site-header ag05-server-header">
    <div class="shell header-main">
      <a class="brand" href="/"><span class="brand-copy"><strong>HealthTimes</strong><small>Zimbabwe · Africa · Global</small></span></a>
      <nav class="desktop-nav" aria-label="Primary"><a href="/">Home</a><a href="/archive.html">Archive</a><a href="/premium.html">Premium</a></nav>
    </div>
  </header>
  <main id="main-content">
    <article class="article-shell">
      <header class="article-head">
        <span class="eyebrow">${esc(sectionName)}</span>
        <h1>${esc(doc.story_title || title)}</h1>
        ${doc.standfirst ? `<p class="article-standfirst">${esc(stripTags(doc.standfirst))}</p>` : ''}
        <div class="article-byline">
          <div class="byline-person"><strong>By ${esc(authorName)}</strong><span>HealthTimes</span></div>
          <div class="story-meta">${published ? `<span>${esc(published)}</span>` : ''}${updated ? `<span>Updated ${esc(updated)}</span>` : ''}</div>
        </div>
      </header>
      ${image ? `<figure class="article-hero-image ag05-reserved-media"><img src="${esc(image)}" alt="${esc(doc.featured_alt_text || '')}" loading="eager" fetchpriority="high"></figure>` : ''}
      <div class="article-layout">
        <div></div>
        <div class="article-body">${articleBody(doc)}</div>
        <aside class="article-context"><div class="context-card"><h3>Source continuity</h3><p>Legacy WordPress ID: ${esc(doc.source_id)}</p><p>URL handling: ${esc(doc.handling)}</p></div></aside>
      </div>
    </article>
  </main>
  <footer class="site-footer"><div class="shell footer-bottom"><span>HealthTimes</span><span>Independent health and science journalism.</span></div></footer>
  <script src="/analytics.js" defer></script>
</body>
</html>`;
}

function renderSitemap(rows) {
  const urls=(rows||[]).map(row=>{
    const lastmod=row.modified_at ? `<lastmod>${esc(String(row.modified_at).slice(0,10))}</lastmod>` : '';
    return `  <url><loc>${esc(row.canonical_url)}</loc>${lastmod}</url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function renderFeed(rows) {
  const items=(rows||[]).map(row=>`<item><title>${esc(row.title)}</title><link>${esc(row.canonical_url)}</link><guid isPermaLink="true">${esc(row.canonical_url)}</guid>${row.published_at?`<pubDate>${esc(new Date(row.published_at).toUTCString())}</pubDate>`:''}${row.author_name?`<dc:creator><![CDATA[${String(row.author_name).replace(/]]>/g,']]]]><![CDATA[>')}]]></dc:creator>`:''}${row.description?`<description><![CDATA[${String(row.description).replace(/]]>/g,']]]]><![CDATA[>')}]]></description>`:''}</item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>HealthTimes</title><link>${SITE_URL}</link><description>HealthTimes health and science journalism</description>${items}</channel></rss>`;
}

function renderAdPreview(ad,{supabaseUrl=''}={}) {
  if(!ad) return null;
  const image=ad.current_storage_object ? storageUrl(supabaseUrl,ad.current_storage_object) : ad.current_source_url;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>HOSPAZ Direct-Ad Rehearsal Preview</title><style>body{font-family:system-ui;margin:0;background:#f5f7f7;color:#10232b}.wrap{max-width:1200px;margin:40px auto;padding:20px}.slot{min-height:clamp(140px,24vw,300px);display:grid;place-items:center;background:#fff;border:1px solid #d8e1e2;border-radius:16px;overflow:hidden}.slot img{width:100%;height:100%;max-height:300px;object-fit:contain;display:block}.meta{margin-top:14px;font-size:14px;line-height:1.6}.label{font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:800}</style></head><body><main class="wrap"><div class="label">Advertisement · HOSPAZ · staging provenance preview</div><div class="slot">${image?`<img src="${esc(image)}" alt="HOSPAZ direct advertising creative">`:'<strong>Migrated creative object is not yet available; source identity remains bound.</strong>'}</div><div class="meta"><strong>Placement:</strong> ${esc(ad.placement_key)}<br><strong>Current source attachment:</strong> ${esc(ad.current_source_attachment_id)}<br><strong>Destination:</strong> ${esc(ad.destination_url_state)}<br><strong>Schedule:</strong> ${esc(ad.schedule_state)}<br><strong>Placement conditions:</strong> ${esc(ad.placement_conditions_state)}<br>No click target or schedule is invented in this preview.</div></main></body></html>`;
}

module.exports={esc,stripTags,sanitizeHtml,storageUrl,resolvedImage,structuredGraph,renderStoryPage,renderSitemap,renderFeed,renderAdPreview};
