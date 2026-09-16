#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SITE = 'https://healthtimes.co.zw';

function parseArgs(argv) {
  const args = {
    site: DEFAULT_SITE,
    outDir: path.join('migration-output', `wordpress-admin-${new Date().toISOString().replace(/[:.]/g, '-')}`),
    wxr: 'split',
    timeoutMs: 45000
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = key === 'timeoutMs' ? Number(next) : next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, data);
}

function writeJson(file, data) {
  writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

function sanitizeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function redactSensitive(value = '') {
  return value
    .replace(/ya29\.[A-Za-z0-9._-]+/g, '[REDACTED_GOOGLE_OAUTH_TOKEN]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
}

function stripTags(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function extractInputValue(html, name) {
  const re = new RegExp(`<input[^>]+name=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  const match = html.match(re);
  if (!match) return '';
  const valueMatch = match[0].match(/\svalue=["']([^"']*)["']/i);
  return valueMatch ? decodeHtml(valueMatch[1]) : '';
}

function extractSelectedRadio(html, name) {
  const re = new RegExp(`<input[^>]+type=["']radio["'][^>]+name=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*checked[^>]*>`, 'i');
  const match = html.match(re) || html.match(new RegExp(`<input[^>]+checked[^>]+name=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i'));
  if (!match) return '';
  const valueMatch = match[0].match(/\svalue=["']([^"']*)["']/i);
  return valueMatch ? decodeHtml(valueMatch[1]) : '';
}

function extractOptions(html, selectName) {
  const selectRe = new RegExp(`<select[^>]+name=["']${selectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i');
  const select = html.match(selectRe);
  if (!select) return { selected: '', options: [] };
  const options = [...select[1].matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/gi)].map(match => {
    const value = (match[1].match(/\svalue=["']([^"']*)["']/i) || [])[1] || '';
    return {
      value: decodeHtml(value),
      label: stripTags(match[2]),
      selected: /\sselected(?:=["'][^"']*["'])?/i.test(match[1])
    };
  });
  return { selected: (options.find(option => option.selected) || {}).value || '', options };
}

function extractAdminNoticeText(html) {
  return [...html.matchAll(/<div[^>]+class=["'][^"']*(?:notice|error|updated)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map(match => stripTags(match[1]))
    .filter(Boolean);
}

function createCookieJar() {
  const jar = new Map();
  return {
    header() {
      return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
    },
    store(response) {
      const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
      const cookies = raw.length ? raw : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
      for (const cookie of cookies) {
        const pair = cookie.split(';')[0];
        const splitAt = pair.indexOf('=');
        if (splitAt > 0) jar.set(pair.slice(0, splitAt), pair.slice(splitAt + 1));
      }
    },
    snapshot() {
      return [...jar.keys()].sort();
    }
  };
}

async function fetchWithCookies(url, options, jar) {
  const headers = { ...(options.headers || {}) };
  const cookieHeader = jar.header();
  if (cookieHeader) headers.cookie = cookieHeader;
  const timeoutMs = options.timeoutMs || 45000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, { ...options, headers, redirect: options.redirect || 'follow', signal: controller.signal })
    .finally(() => clearTimeout(timeout));
  jar.store(response);
  return response;
}

async function getText(url, jar, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { accept: 'text/html,application/xhtml+xml' };
    const cookieHeader = jar.header();
    if (cookieHeader) headers.cookie = cookieHeader;
    const response = await fetch(url, { headers, redirect: 'follow', signal: controller.signal });
    jar.store(response);
    return { response, text: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

async function login(site, username, password, jar, timeoutMs) {
  const loginUrl = `${site.replace(/\/$/, '')}/wp-login.php`;
  await getText(loginUrl, jar, timeoutMs);
  const body = new URLSearchParams({
    log: username,
    pwd: password,
    'wp-submit': 'Log In',
    redirect_to: `${site.replace(/\/$/, '')}/wp-admin/`,
    testcookie: '1'
  });

  const response = await fetchWithCookies(loginUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: loginUrl
    },
    body,
    redirect: 'manual'
  }, jar);

  if (![302, 303].includes(response.status)) {
    const text = await response.text();
    throw new Error(`WordPress login did not redirect after submit. HTTP ${response.status}. ${stripTags(text).slice(0, 220)}`);
  }

  const dashboard = await getText(`${site.replace(/\/$/, '')}/wp-admin/`, jar, timeoutMs);
  if (!/wp-admin-bar|Dashboard|wp-admin/.test(dashboard.text)) {
    throw new Error('WordPress login did not produce an authenticated dashboard response.');
  }
  return dashboard.text;
}

async function capturePage({ site, jar, outDir, slug, urlPath, timeoutMs }) {
  const url = `${site.replace(/\/$/, '')}${urlPath}`;
  const { response, text } = await getText(url, jar, timeoutMs);
  const file = path.join(outDir, 'admin-html', `${sanitizeName(slug)}.html`);
  writeFile(file, redactSensitive(text));
  return {
    slug,
    urlPath,
    status: response.status,
    bytes: Buffer.byteLength(text),
    sha256: sha256(Buffer.from(text)),
    notices: extractAdminNoticeText(text),
    file
  };
}

function summarizeGeneral(html) {
  return {
    blogname: extractInputValue(html, 'blogname'),
    blogdescription: extractInputValue(html, 'blogdescription'),
    siteurl: extractInputValue(html, 'siteurl'),
    home: extractInputValue(html, 'home'),
    timezone_string: extractOptions(html, 'timezone_string').selected,
    date_format: extractSelectedRadio(html, 'date_format'),
    time_format: extractSelectedRadio(html, 'time_format'),
    start_of_week: extractOptions(html, 'start_of_week').selected
  };
}

function summarizeReading(html) {
  return {
    show_on_front: extractSelectedRadio(html, 'show_on_front'),
    page_on_front: extractOptions(html, 'page_on_front').selected,
    page_for_posts: extractOptions(html, 'page_for_posts').selected,
    posts_per_page: extractInputValue(html, 'posts_per_page'),
    posts_per_rss: extractInputValue(html, 'posts_per_rss'),
    rss_use_excerpt: extractSelectedRadio(html, 'rss_use_excerpt'),
    blog_public: extractSelectedRadio(html, 'blog_public')
  };
}

function summarizePermalinks(html) {
  return {
    selection: extractSelectedRadio(html, 'selection'),
    permalink_structure: extractInputValue(html, 'permalink_structure'),
    category_base: extractInputValue(html, 'category_base'),
    tag_base: extractInputValue(html, 'tag_base')
  };
}

function summarizePlugins(html) {
  const plugins = [];
  const rows = [...html.matchAll(/<tr[^>]+data-plugin=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    plugins.push({
      plugin: decodeHtml(row[1]),
      active: /class=["'][^"']*\bactive\b/i.test(row[0]),
      title: stripTags((row[2].match(/<strong[^>]*>([\s\S]*?)<\/strong>/i) || [])[1] || '')
    });
  }
  return plugins;
}

function summarizeUsers(html) {
  const rows = [...html.matchAll(/<tr[^>]+id=["']user-\d+["'][^>]*>([\s\S]*?)<\/tr>/gi)];
  return rows.map(row => ({
    username: stripTags((row[1].match(/class=["']username column-username[\s\S]*?<\/strong>/i) || [''])[0]),
    name: stripTags((row[1].match(/class=["']name column-name["'][^>]*>([\s\S]*?)<\/td>/i) || [])[1] || ''),
    email_present: /class=["']email column-email/i.test(row[1]),
    role: stripTags((row[1].match(/class=["']role column-role["'][^>]*>([\s\S]*?)<\/td>/i) || [])[1] || ''),
    posts: stripTags((row[1].match(/class=["']posts column-posts[\s\S]*?<\/td>/i) || [''])[0])
  }));
}

function summarizeSiteKit(html) {
  const apiFetchData = extractJsVarJson(html, '_googlesitekitAPIFetchData');
  const modulesData = extractJsVarJson(html, '_googlesitekitModulesData');
  const data = apiFetchData && apiFetchData.preloadedData ? apiFetchData.preloadedData : {};
  const bodyFor = route => data[route] && data[route].body ? data[route].body : null;
  const text = stripTags(html);
  return {
    mentions: {
      analytics: /Analytics/i.test(text),
      searchConsole: /Search Console/i.test(text),
      adsense: /AdSense/i.test(text),
      pageSpeed: /PageSpeed/i.test(text),
      googleAds: /Google Ads/i.test(text)
    },
    googleTagIds: [...new Set((html.match(/GT-[A-Z0-9-]+/g) || []))],
    adsenseClients: [...new Set((html.match(/ca-pub-\d+/g) || []))],
    publisherIds: [...new Set((html.match(/pub-\d+/g) || []))],
    modules: bodyFor('/google-site-kit/v1/core/modules/data/list') || [],
    settings: {
      searchConsole: bodyFor('/google-site-kit/v1/modules/search-console/data/settings'),
      ads: bodyFor('/google-site-kit/v1/modules/ads/data/settings'),
      analytics4: bodyFor('/google-site-kit/v1/modules/analytics-4/data/settings'),
      adsense: bodyFor('/google-site-kit/v1/modules/adsense/data/settings'),
      pageSpeedInsights: bodyFor('/google-site-kit/v1/modules/pagespeed-insights/data/settings'),
      consentMode: bodyFor('/google-site-kit/v1/core/site/data/consent-mode'),
      consentApiInfo: bodyFor('/google-site-kit/v1/core/site/data/consent-api-info'),
      conversionTracking: bodyFor('/google-site-kit/v1/core/site/data/conversion-tracking'),
      emailReporting: bodyFor('/google-site-kit/v1/core/site/data/email-reporting'),
      audienceSettings: bodyFor('/google-site-kit/v1/modules/analytics-4/data/audience-settings')
    },
    moduleData: modulesData || {}
  };
}

function extractJsVarJson(html, varName) {
  const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`var\\s+${escaped}\\s*=\\s*({[\\s\\S]*?});\\s*(?://# sourceURL|<\\/script>)`, 'm'));
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function downloadExport({ site, jar, outDir, filename, params, timeoutMs }) {
  const referer = `${site.replace(/\/$/, '')}/wp-admin/export.php`;
  const query = new URLSearchParams({
    download: 'true',
    cat: '0',
    post_author: 'all',
    post_start_date: '0',
    post_end_date: '0',
    post_status: 'all',
    page_author: 'all',
    page_start_date: '0',
    page_end_date: '0',
    page_status: 'all',
    attachment_start_date: '0',
    attachment_end_date: '0',
    submit: 'Download Export File',
    ...params
  });
  const url = `${site.replace(/\/$/, '')}/wp-admin/export.php?${query.toString()}`;
  const startedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    console.error(`export ${filename}...`);
    const headers = { referer, accept: 'application/xml,text/xml,*/*' };
    const cookieHeader = jar.header();
    if (cookieHeader) headers.cookie = cookieHeader;
    const response = await fetch(url, { headers, redirect: 'follow', signal: controller.signal });
    jar.store(response);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';
    const disposition = response.headers.get('content-disposition') || '';
    const isXml = /xml/i.test(contentType) || /xml/i.test(disposition) || buffer.toString('utf8', 0, Math.min(buffer.length, 200)).includes('<?xml');
    const extension = isXml ? '.xml' : '.bin';
    const file = path.join(outDir, 'exports', `${filename}${extension}`);
    writeFile(file, buffer);
    return {
      status: response.ok && isXml && buffer.length > 0 ? 'downloaded' : 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      httpStatus: response.status,
      contentType,
      contentDisposition: disposition,
      bytes: buffer.length,
      sha256: sha256(buffer),
      file,
      params
    };
  } catch (error) {
    return {
      status: error.name === 'AbortError' ? 'timeout' : 'error',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message,
      params
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadWxr({ site, jar, outDir, mode, timeoutMs }) {
  const exportPage = await getText(`${site.replace(/\/$/, '')}/wp-admin/export.php`, jar, timeoutMs);
  const nonce = extractInputValue(exportPage.text, '_wpnonce');
  if (mode === 'none') return { mode, exports: [] };
  if (mode === 'all') {
    const params = { content: 'all' };
    if (nonce) params._wpnonce = nonce;
    const result = await downloadExport({ site, jar, outDir, filename: 'wordpress-all-content', params, timeoutMs });
    return { mode, exports: [result] };
  }

  const exportJobs = [
    { filename: 'wordpress-pages', params: { content: 'pages' } },
    { filename: 'wordpress-products', params: { content: 'product' } },
    { filename: 'wordpress-elementor-templates', params: { content: 'elementor_library' } },
    { filename: 'wordpress-elementor-header-footer', params: { content: 'elementor-hf' } },
    { filename: 'wordpress-membership-plans', params: { content: 'wc_membership_plan' } },
    { filename: 'wordpress-user-memberships', params: { content: 'wc_user_membership' } },
    { filename: 'wordpress-subscriptions', params: { content: 'shop_subscription' } }
  ];
  const currentYear = new Date().getFullYear();
  for (let year = 2017; year <= currentYear; year += 1) {
    exportJobs.push({
      filename: `wordpress-posts-${year}`,
      params: { content: 'posts', post_start_date: `${year}-01`, post_end_date: `${year}-12`, post_status: 'all' }
    });
    exportJobs.push({
      filename: `wordpress-media-${year}`,
      params: { content: 'attachment', attachment_start_date: `${year}-01`, attachment_end_date: `${year}-12` }
    });
  }
  if (nonce) exportJobs.forEach(job => { job.params._wpnonce = nonce; });
  const exports = [];
  for (const job of exportJobs) {
    exports.push(await downloadExport({ site, jar, outDir, filename: job.filename, params: job.params, timeoutMs }));
  }
  return { mode, exports };
}

async function fetchPublicText(site, route, timeoutMs = 15000) {
  const url = `${site.replace(/\/$/, '')}${route}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    console.error(`public ${route}...`);
    const response = await fetch(url, { headers: { accept: 'text/plain,*/*' }, signal: controller.signal });
    const text = await response.text();
    return {
      route,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      bytes: Buffer.byteLength(text),
      sha256: sha256(Buffer.from(text)),
      text
    };
  } catch (error) {
    return { route, status: 'error', error: error.name === 'AbortError' ? 'timeout' : error.message, text: '' };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const username = process.env.WP_USER;
  const password = process.env.WP_PASS;
  if (!username || !password) {
    throw new Error('Set WP_USER and WP_PASS in the local environment to capture WordPress admin evidence.');
  }

  ensureDir(args.outDir);
  const jar = createCookieJar();
  const site = args.site.replace(/\/$/, '');
  console.error('login...');
  const dashboardHtml = await login(site, username, password, jar, args.timeoutMs);
  writeFile(path.join(args.outDir, 'admin-html', 'dashboard.html'), redactSensitive(dashboardHtml));

  const pagesToCapture = [
    ['general-settings', '/wp-admin/options-general.php'],
    ['reading-settings', '/wp-admin/options-reading.php'],
    ['permalink-settings', '/wp-admin/options-permalink.php'],
    ['media-settings', '/wp-admin/options-media.php'],
    ['discussion-settings', '/wp-admin/options-discussion.php'],
    ['privacy-settings', '/wp-admin/options-privacy.php'],
    ['export', '/wp-admin/export.php'],
    ['plugins', '/wp-admin/plugins.php'],
    ['themes', '/wp-admin/themes.php'],
    ['users', '/wp-admin/users.php'],
    ['site-health', '/wp-admin/site-health.php'],
    ['ad-inserter', '/wp-admin/options-general.php?page=ad-inserter.php'],
    ['site-kit-dashboard', '/wp-admin/admin.php?page=googlesitekit-dashboard'],
    ['site-kit-settings', '/wp-admin/admin.php?page=googlesitekit-settings']
  ];
  if (args.includeHeavyAdmin) {
    pagesToCapture.push(
      ['woocommerce-analytics', '/wp-admin/admin.php?page=wc-admin&path=/analytics/overview'],
      ['woocommerce-orders', '/wp-admin/admin.php?page=wc-orders'],
      ['woocommerce-subscriptions', '/wp-admin/admin.php?page=subscriptions']
    );
  }

  const captured = [];
  for (const [slug, urlPath] of pagesToCapture) {
    try {
      console.error(`page ${slug}...`);
      captured.push(await capturePage({ site, jar, outDir: args.outDir, slug, urlPath, timeoutMs: args.timeoutMs }));
    } catch (error) {
      captured.push({ slug, urlPath, status: 'error', error: error.message });
    }
  }

  const htmlFor = slug => {
    const item = captured.find(page => page.slug === slug);
    return item && item.file && fs.existsSync(item.file) ? fs.readFileSync(item.file, 'utf8') : '';
  };

  console.error(`wxr ${args.wxr}...`);
  const wxr = await downloadWxr({ site, jar, outDir: args.outDir, mode: args.wxr, timeoutMs: args.timeoutMs });
  const adsTxt = await fetchPublicText(site, '/ads.txt', args.timeoutMs);
  const appAdsTxt = await fetchPublicText(site, '/app-ads.txt', args.timeoutMs);
  writeFile(path.join(args.outDir, 'public', 'ads.txt'), adsTxt.text);
  writeFile(path.join(args.outDir, 'public', 'app-ads.txt'), appAdsTxt.text);

  const summary = {
    generatedAt: new Date().toISOString(),
    site,
    mode: 'read-only-admin-capture',
    cookieNames: jar.snapshot(),
    capturedPages: captured.map(item => {
      const clone = { ...item };
      if (clone.file) clone.file = path.relative(process.cwd(), clone.file);
      return clone;
    }),
    settings: {
      general: summarizeGeneral(htmlFor('general-settings')),
      reading: summarizeReading(htmlFor('reading-settings')),
      permalinks: summarizePermalinks(htmlFor('permalink-settings'))
    },
    plugins: summarizePlugins(htmlFor('plugins')),
    usersSummary: summarizeUsers(htmlFor('users')),
    siteKit: {
      dashboard: summarizeSiteKit(htmlFor('site-kit-dashboard')),
      settings: summarizeSiteKit(htmlFor('site-kit-settings'))
    },
    publicFiles: {
      adsTxt: { ...adsTxt, text: adsTxt.text.trim().slice(0, 500) },
      appAdsTxt: { ...appAdsTxt, text: appAdsTxt.text.trim().slice(0, 500) }
    },
    wxr: {
      ...wxr,
      exports: wxr.exports.map(item => ({ ...item, file: item.file ? path.relative(process.cwd(), item.file) : undefined }))
    },
    notes: [
      'No WordPress settings were changed by this capture.',
      'Raw HTML and WXR output are local evidence only and must remain out of Git.',
      'Credentials are not written by this script.'
    ]
  };
  writeJson(path.join(args.outDir, 'wordpress-admin-summary.json'), summary);
  console.log(JSON.stringify({
    outDir: args.outDir,
    pagesCaptured: captured.length,
    wxr: {
      mode: summary.wxr.mode,
      downloaded: summary.wxr.exports.filter(item => item.status === 'downloaded').length,
      failed: summary.wxr.exports.filter(item => item.status !== 'downloaded').length,
      statuses: summary.wxr.exports.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {})
    },
    permalink: summary.settings.permalinks,
    adsTxt: summary.publicFiles.adsTxt.status,
    appAdsTxt: summary.publicFiles.appAdsTxt.status
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
