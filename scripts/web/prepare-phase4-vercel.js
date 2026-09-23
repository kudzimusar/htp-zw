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

for (const file of ['index.html','explore.html','live.html','watch.html','search.html','premium.html','my.html','404.html','manifest.json','sw.js','healthtimes-icon.svg']) {
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

const protectedFiles = [
  'newsroom.html',
  'newsroom.js',
  'newsroom.css',
  'styles.css',
  'favicon.svg',
  'site.webmanifest',
  'robots.txt'
];

for (const relative of protectedFiles) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) throw new Error('Required protected/operational file missing: ' + relative);
  fs.copyFileSync(source, path.join(dist, relative));
}

const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local';
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify({
  sha,
  presentation: 'apps/mobile',
  capability: 'cp5-phase3-v1',
  basePath: '/',
  serviceMode: process.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE || 'source-parity'
}, null, 2) + '\n');

console.log('Phase 4 universal Reader export prepared for Vercel root origin.');
