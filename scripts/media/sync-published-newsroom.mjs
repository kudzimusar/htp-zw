import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const assetDirectory = process.argv[2];
const allowlistFile = process.argv[3];
if (!base || !key || !assetDirectory || !allowlistFile) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, then pass asset directory and allowlist path');
const headers = { apikey: key, 'Content-Type': 'application/json' };
const exec = promisify(execFile);

async function rpc(name, args) {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(args) });
  if (!response.ok) throw new Error(`${name} failed: HTTP ${response.status}`);
  return response.json();
}

const stories = await rpc('newsroom_public_published_stories', { p_slug: null });
if (!Array.isArray(stories)) throw new Error('Published story list is invalid');
const keys = new Set();
const checksums = new Map();
const prefix = '/storage/v1/object/public/newsroom-public/';
for (const story of stories) {
  const doc = await rpc('newsroom_public_story_document', { p_path: `/${story.slug}/` });
  if (!doc || doc.access_policy !== 'public') continue;
  if (doc.featured_storage_bucket === 'newsroom-public' && doc.featured_storage_object) {
    keys.add(doc.featured_storage_object);
    if (doc.featured_checksum) checksums.set(doc.featured_storage_object, doc.featured_checksum.toLowerCase());
  }
  for (const match of String(doc.body_html ?? '').matchAll(/\/storage\/v1\/object\/public\/newsroom-public\/([^\s"'<>?]+)/g)) {
    const raw = match[1].split('/').map(decodeURIComponent).join('/');
    keys.add(raw);
  }
}

const verified = [];
for (const name of [...keys].sort()) {
  if (!name || name.startsWith('/') || name.split('/').includes('..')) throw new Error('Unsafe public object path');
  const url = `${base}${prefix}${name.split('/').map(encodeURIComponent).join('/')}`;
  const target = path.join(assetDirectory, 'newsroom-public', name);
  await mkdir(path.dirname(target), { recursive: true });
  await exec('curl', ['--fail', '--silent', '--show-error', '--location', '--retry', '5', '--retry-all-errors', '--output', target, url]);
  const bytes = await readFile(target);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const expected = checksums.get(name);
  if (expected && sha256 !== expected) throw new Error(`Published checksum mismatch: ${name}`);
  verified.push({ name, bytes: bytes.length, sha256 });
}
await mkdir(path.dirname(allowlistFile), { recursive: true });
const names = JSON.stringify(verified.map(x => x.name).sort(), null, 2);
await writeFile(allowlistFile, allowlistFile.endsWith('.ts')
  ? `// Generated from public Reader story documents. Do not add draft or private keys.\nexport const mirroredNewsroomKeys = new Set<string>(${names});\n`
  : names + '\n');
console.log(JSON.stringify({ publishedStories: stories.length, mirroredObjects: verified.length, bytes: verified.reduce((sum, x) => sum + x.bytes, 0) }));
