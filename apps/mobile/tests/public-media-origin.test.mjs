import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { loadTs } from './ts-module-loader.mjs';

const source = readFileSync(join(import.meta.dirname, '../src/services/public-media-origin.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', output)(module, module.exports);
const { migratedMediaUrl, mapMigratedInlineMedia } = module.exports;
const supabase = 'https://bzuvntbkevvuhfhqhkua.supabase.co';
const original = process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL;

test('Cloudflare URL applies only to archived public objects', () => {
  process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = 'https://media-preview.healthtimes-media.pages.dev';
  try {
    assert.equal(migratedMediaUrl(supabase, 'wordpress/2026/a b.jpg'), 'https://media-preview.healthtimes-media.pages.dev/wordpress/2026/a%20b.jpg');
    const body = `<img src="${supabase}/storage/v1/object/public/migrated-media/wordpress/a.jpg"><a href="${supabase}/storage/v1/object/public/newsroom-private/secret.pdf">private</a>`;
    const mapped = mapMigratedInlineMedia(body, supabase);
    assert.match(mapped, /pages\.dev\/wordpress\/a\.jpg/);
    assert.match(mapped, /supabase\.co\/storage\/v1\/object\/public\/newsroom-private\/secret\.pdf/);
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL;
    else process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = original;
  }
});

test('missing or invalid Cloudflare setting preserves Supabase URL', () => {
  process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = 'http://insecure.example';
  try {
    assert.equal(migratedMediaUrl(supabase, 'wordpress/a.jpg'), `${supabase}/storage/v1/object/public/migrated-media/wordpress/a.jpg`);
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL;
    else process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = original;
  }
});

test('verified source-parity images use Cloudflare only when configured', () => {
  process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = 'https://media-preview.healthtimes-media.pages.dev';
  try {
    const snapshot = loadTs('src/source-parity/snapshot.ts');
    const source = 'https://healthtimes.co.zw/wp-content/uploads/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg';
    assert.equal(snapshot.publicMirrorForSourceMedia(source), 'https://media-preview.healthtimes-media.pages.dev/wordpress/2026/09/enerst-chikwati-ahf-zimbabwe-country-director.jpeg');
    assert.equal(snapshot.publicMirrorForSourceMedia('https://third-party.example/photo.jpg'), null);
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL;
    else process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = original;
  }
});
