import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.SUPABASE_URL;
const output = process.argv[2];
const inventory = process.argv[3];
if (!base || !output || !inventory) throw new Error('Set SUPABASE_URL and pass output directory and public inventory');
const bucket = 'migrated-media';
const objects = JSON.parse(await readFile(inventory, 'utf8'));
const execFileAsync = promisify(execFile);
if (objects.some(({name}) => name.startsWith('/') || name.split('/').includes('..'))) throw new Error('Unsafe storage path');
if (objects.some(({md5}) => !/^[a-f0-9]{32}$/i.test(md5 ?? ''))) throw new Error('Source MD5 required for every object');
let bytes = 0;
let cursor = 0;
let completed = 0;
const failed = [];
async function worker() {
while (cursor < objects.length) {
  const index = cursor++;
  const object = objects[index];
  try {
  const target = path.join(output, object.name);
  let data;
  try {
    if ((await stat(target)).size === Number(object.size)) {
      const existing = await readFile(target);
      if (createHash('md5').update(existing).digest('hex') === object.md5) data = existing;
    }
  } catch {}
  if (!data) {
  const url = `${base}/storage/v1/object/public/${bucket}/${object.name.split('/').map(encodeURIComponent).join('/')}`;
  await mkdir(path.dirname(target), { recursive: true });
  await execFileAsync('curl', ['--fail', '--silent', '--show-error', '--location', '--retry', '5', '--retry-all-errors', '--retry-delay', '1', '--output', target, url]);
  data = await readFile(target);
  if (object.size && data.length !== Number(object.size)) throw new Error(`Size mismatch: ${object.name}`);
  }
  object.sha256 = createHash('sha256').update(data).digest('hex');
  if (createHash('md5').update(data).digest('hex') !== object.md5) throw new Error(`Source checksum mismatch: ${object.name}`);
  bytes += data.length;
  if (++completed % 100 === 0) process.stderr.write(`${completed}/${objects.length}\n`);
  } catch (error) {
    failed.push(object.name);
    process.stderr.write(`Failed ${object.name}: ${error.message.split('\n')[0]}\n`);
  }
}
}
await Promise.all(Array.from({length: 4}, () => worker()));
if (failed.length) throw new Error(`${failed.length} objects failed; rerun to resume`);
await writeFile(path.join(output, '..', 'media-manifest.json'), JSON.stringify({ bucket, count: objects.length, bytes, objects }, null, 2));
console.log(JSON.stringify({ count: objects.length, bytes }));
