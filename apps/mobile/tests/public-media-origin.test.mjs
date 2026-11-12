import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './ts-module-loader.mjs';

const { migratedMediaUrl, mapMigratedInlineMedia, mirroredNewsroomPublicUrl } = loadTs('src/services/public-media-origin.ts');
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

test('only verified published newsroom keys switch to Cloudflare', () => {
  process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = 'https://media-preview.healthtimes-media.pages.dev';
  try {
    const key = 'story-media/ac1d99cd-0329-46d2-901d-fbca149ac273/e2bf458d-0c50-4d3d-87f2-10fa1f85c31a/6038ddbba9bd5e64136396ff22af93015464f4b6e465ee20c09f5c8ff64627ea/R01-home-phone-375x667.jpg';
    const published = `${supabase}/storage/v1/object/public/newsroom-public/${key}`;
    assert.equal(mirroredNewsroomPublicUrl(published), `https://media-preview.healthtimes-media.pages.dev/newsroom-public/${key}`);
    assert.equal(mirroredNewsroomPublicUrl(`${supabase}/storage/v1/object/public/newsroom-public/draft.jpg`), `${supabase}/storage/v1/object/public/newsroom-public/draft.jpg`);
    assert.equal(mirroredNewsroomPublicUrl(`${supabase}/storage/v1/object/public/newsroom-private/secret.jpg`), `${supabase}/storage/v1/object/public/newsroom-private/secret.jpg`);
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL;
    else process.env.EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL = original;
  }
});
