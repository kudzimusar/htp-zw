const { test, expect } = require('@playwright/test');

const baseURL=String(process.env.AG05_LIVE_BASE_URL||'http://127.0.0.1:4174').replace(/\/$/,'');
const premiumPath='/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/';
const publicPath='/2026/02/12/who-should-not-take-lenacapavir-key-health-conditions-to-consider-before-the-rollout/';
const pagePath='/global-health/';
const aliasPath='/policy-capture-at-cop11-what-it-signals-for-global-health-governance/';
const missingPath='/2017/04/04/gwinji-appeals-funding-health-sector/';

function occurrences(text,needle){
  return text.split(needle).length-1;
}

async function clsFor(page,path){
  await page.addInitScript(()=>{
    window.__ag05CLS=0;
    new PerformanceObserver(list=>{
      for(const entry of list.getEntries()){
        if(!entry.hadRecentInput) window.__ag05CLS += entry.value;
      }
    }).observe({type:'layout-shift',buffered:true});
  });
  await page.goto(baseURL+path,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  return page.evaluate(()=>window.__ag05CLS||0);
}

test.describe('AG-05 completed rehearsal runtime',()=>{
  test('robots, sitemap and feed are complete',async({request})=>{
    const robots=await request.get(baseURL+'/robots.txt');
    expect(robots.status()).toBe(200);
    expect((await robots.text()).trim()).toContain('Disallow: /');

    const sitemap=await request.get(baseURL+'/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('application/xml');
    expect(sitemap.headers()['x-ag05-sitemap-url-count']).toBe('5786');
    const xml=await sitemap.text();
    expect(occurrences(xml,'<url>')).toBe(5786);
    expect(xml).toContain('https://healthtimes.co.zw/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/');

    const feed=await request.get(baseURL+'/feed/');
    expect(feed.status()).toBe(200);
    expect(feed.headers()['content-type']).toContain('application/rss+xml');
    expect(feed.headers()['x-ag05-feed-item-count']).toBe('50');
    expect(occurrences(await feed.text(),'<item>')).toBe(50);
  });

  test('representative preserved-direct Premium-review story emits authority metadata without full body',async({request})=>{
    const response=await request.get(baseURL+premiumPath);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-ag05-resolution']).toBe('preserved_direct');
    expect(response.headers()['x-ag05-source-id']).toBe('33190');
    const html=await response.text();
    expect(html).toContain('<title>Zimbabwe Looks to Strengthen Social Contracting as HIV Donor Funding Shrinks</title>');
    expect(html).toContain('<link rel="canonical" href="https://healthtimes.co.zw/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/">');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('Article access is being verified.');
  });

  test('representative public story emits its migrated body in server HTML',async({request})=>{
    const response=await request.get(baseURL+publicPath);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-ag05-resolution']).toBe('preserved_direct');
    expect(response.headers()['x-ag05-source-id']).toBe('30154');
    const html=await response.text();
    expect(html).toContain('Who Should Not Take Lenacapavir? Key Health Conditions to Consider Before the Rollout');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).not.toContain('Article access is being verified.');
    const body=(html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<aside class="article-context">/)||[])[1]||'';
    expect(body.length).toBeGreaterThan(200);
  });

  test('representative migrated page uses Article + Person + BreadcrumbList',async({request})=>{
    const response=await request.get(baseURL+pagePath);
    expect(response.status()).toBe(200);
    const html=await response.text();
    expect(html).toContain('<link rel="canonical" href="https://healthtimes.co.zw/global-health/">');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('"@type":"BreadcrumbList"');
  });


  test('category and tag context routes use imported identities while unverifiable author alias stays 404',async({request})=>{
    const category=await request.get(baseURL+'/category/health_news/');
    expect(category.status()).toBe(200);
    expect(category.headers()['x-ag05-resolution']).toBe('PRESERVE_CONTEXT_NOINDEX');
    const categoryHtml=await category.text();
    expect(categoryHtml).toContain('<title>Health News — HealthTimes</title>');
    expect(categoryHtml).toContain('<meta name="robots" content="noindex,follow">');
    expect(categoryHtml).toContain('<link rel="canonical" href="https://healthtimes.co.zw/category/health_news/">');

    const tag=await request.get(baseURL+'/tag/cpu/');
    expect(tag.status()).toBe(200);
    expect(tag.headers()['x-ag05-resolution']).toBe('LEGACY_CONTEXT_NOINDEX');
    expect(await tag.text()).toContain('<title>CPU — HealthTimes</title>');

    const authorAlias=await request.get(baseURL+'/author/michael-gwarisa/',{maxRedirects:0});
    expect(authorAlias.status()).toBe(404);
    expect(authorAlias.headers()['x-ag05-resolution']).toBe('context_alias_evidence_missing');
  });

  test('historical alias is one hop and unmatched path remains explicit 404',async({request})=>{
    const alias=await request.get(baseURL+aliasPath,{maxRedirects:0});
    expect(alias.status()).toBe(301);
    expect(alias.headers()['x-ag05-resolution']).toBe('alias_redirect');
    const target=alias.headers().location;
    expect(target).toBeTruthy();
    expect(target).not.toBe('/');
    expect(target).not.toBe(aliasPath);

    const targetResponse=await request.get(baseURL+target,{maxRedirects:0});
    expect(targetResponse.status()).toBe(200);
    expect(targetResponse.headers()['x-ag05-resolution']).toBe('preserved_direct');

    const missing=await request.get(baseURL+missingPath,{maxRedirects:0});
    expect(missing.status()).toBe(404);
    expect(missing.headers()['x-ag05-resolution']).toBe('explicit_404_exception');
    expect(await missing.text()).toContain('No authoritative migrated destination is known');
  });

  test('HOSPAZ direct-ad preview preserves unknowns and does not invent a click target',async({request})=>{
    const response=await request.get(baseURL+'/__ag05/direct-ad-preview');
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    const html=await response.text();
    expect(html).toContain('HOSPAZ');
    expect(html).toContain('33005');
    expect(occurrences(html,'UNKNOWN')).toBeGreaterThanOrEqual(3);
    expect(html).toContain('No click target or schedule is invented');
    expect(html).not.toContain('<a ');
  });

  for(const width of [375,430,1440]){
    test(`migrated public story has no horizontal overflow at ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:Math.max(812,Math.round(width*1.8))});
      await page.goto(baseURL+publicPath,{waitUntil:'domcontentloaded'});
      await expect(page.locator('h1')).toContainText('Who Should Not Take Lenacapavir');
      const diagnostics=await page.evaluate(()=>{
        const overflow=document.documentElement.scrollWidth-window.innerWidth;
        const offenders=[...document.querySelectorAll('body *')].map((el,index)=>{
          const r=el.getBoundingClientRect();
          return {index,tag:el.tagName,cls:el.className||'',left:r.left,right:r.right,width:r.width,html:el.outerHTML.slice(0,220)};
        }).filter(row=>row.right>window.innerWidth+2||row.left<-2).slice(0,20);
        return {overflow,innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,offenders};
      });
      if(diagnostics.overflow>2) console.log('AG05_OVERFLOW_DIAGNOSTICS',JSON.stringify(diagnostics));
      expect(diagnostics.overflow).toBeLessThanOrEqual(2);
    });
  }

  test('CLS remediation holds on home, migrated story and direct-ad preview',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});
    const home=await clsFor(page,'/');
    const story=await clsFor(page,publicPath);
    const ad=await clsFor(page,'/__ag05/direct-ad-preview');
    test.info().annotations.push({type:'CLS',description:`home=${home.toFixed(4)} story=${story.toFixed(4)} ad=${ad.toFixed(4)}`});
    expect(home).toBeLessThanOrEqual(0.10);
    expect(story).toBeLessThanOrEqual(0.10);
    expect(ad).toBeLessThanOrEqual(0.10);
  });
});
