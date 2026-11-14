'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const dist = path.join(root, 'apps/mobile/dist');

function required(relative) {
  const full = path.join(dist, relative);
  if (!fs.existsSync(full)) throw new Error('Missing Phase 4 Reader export: ' + relative);
  return full;
}

for (const file of ['index.html','explore.html','live.html','watch.html','search.html','premium.html','my.html','+not-found.html','manifest.json','sw.js','healthtimes-icon.svg']) {
  required(file);
}

const index = fs.readFileSync(required('index.html'), 'utf8');
if (index.includes('/htp-zw/')) throw new Error('Phase 4 root-origin export still depends on /htp-zw/.');
if (!index.includes('/manifest.json') || !index.includes('/sw.js')) {
  throw new Error('Phase 4 root-origin PWA markers are missing.');
}

const manifest = JSON.parse(fs.readFileSync(required('manifest.json'), 'utf8'));
if (manifest.start_url !== './' || manifest.scope !== './' || manifest.id !== './') {
  throw new Error('PWA manifest is not root-origin/subpath neutral.');
}

const sw = fs.readFileSync(required('sw.js'), 'utf8');
if (!sw.includes('self.registration.scope')) {
  throw new Error('Service worker must derive its active scope.');
}

for (const retired of ['app.js','v21.js','reader.js']) {
  if (fs.existsSync(path.join(dist, retired))) {
    throw new Error('Retired root runtime leaked into canonical apps/mobile export: ' + retired);
  }
}

for (const [sourceRel, targetRel] of [
  ['studio/staff/[staffId].html', 'studio/staff/fallback.html'],
  ['article/[id].html', 'article/fallback.html'],
  ['author/[slug].html', 'author/fallback.html']
]) {
  const sourcePath = path.join(dist, sourceRel);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(dist, targetRel));
  }
}

// G5: the public page renderer (api/public.js kind=page) fetches this exact
// exported shell so server-rendered legacy/article pages keep the same inline
// scripts (CSP hashes) and hydration markup as every static page.
fs.mkdirSync(path.join(dist, '_htp'), { recursive: true });
fs.copyFileSync(required('+not-found.html'), path.join(dist, '_htp/reader-shell.html'));

// G5: Expo Router's development route index lists every Studio and Owner
// Preview route. It is not a public page.
for (const devIndex of ['_sitemap.html']) {
  fs.rmSync(path.join(dist, devIndex), { force: true });
}

// G5: Content-Security-Policy drift guard. vercel.json enforces script-src by
// sha256 hash; an exported inline script without a matching hash would render
// the Reader blank, so the build fails instead.
(function verifyCspInlineScriptHashes() {
  const configPath = path.join(root, 'vercel.json');
  if (!fs.existsSync(configPath)) return;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const csp = (config.headers || [])
    .flatMap(rule => rule.headers || [])
    .find(header => String(header.key).toLowerCase() === 'content-security-policy');
  if (!csp) return;
  const scriptSrc = String(csp.value).split(';').map(part => part.trim()).find(part => part.startsWith('script-src '));
  if (!scriptSrc) throw new Error('CSP_SCRIPT_SRC_MISSING: vercel.json Content-Security-Policy has no script-src.');
  const allowed = new Set((scriptSrc.match(/'sha256-[A-Za-z0-9+/=]+'/g) || []).map(token => token.slice(1, -1)));
  const crypto = require('node:crypto');
  const missing = new Map();
  const used = new Set();
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : (entry.name.endsWith('.html') ? [full] : []);
  });
  for (const file of walk(dist)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = match[1] || '';
      const body = match[2] || '';
      if (/\bsrc\s*=/i.test(attrs) || !body) continue;
      const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
      if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type)) continue;
      const hash = 'sha256-' + crypto.createHash('sha256').update(body, 'utf8').digest('base64');
      used.add(hash);
      if (!allowed.has(hash) && !missing.has(hash)) missing.set(hash, path.relative(dist, file));
    }
  }
  if (missing.size) {
    throw new Error('CSP_INLINE_SCRIPT_NOT_ALLOWED: add these hashes to vercel.json script-src after review: ' +
      [...missing].map(([hash, file]) => hash + ' (' + file + ')').join(', '));
  }
  const unused = [...allowed].filter(hash => !used.has(hash));
  console.log('CSP inline-script hashes verified: ' + used.size + ' in use' + (unused.length ? ', unused: ' + unused.join(', ') : '') + '.');
})();

const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || (function() {
  try {
    return require('node:child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
})();
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify({
  sha,
  presentation: 'apps/mobile',
  capability: 'cp5-phase3-v1',
  basePath: '/',
  serviceMode: process.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE || 'source-parity'
}, null, 2) + '\n');

console.log('Canonical apps/mobile root-origin evidence export prepared without legacy operational-file recustody.');
