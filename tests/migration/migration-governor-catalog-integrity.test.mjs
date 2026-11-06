import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyManifestCatalog } from '../../scripts/release/ht-migration-governor.mjs';

const plan = [
  {file:'001_alpha.sql', classification:'CANONICAL_BASELINE', sha256:'a'.repeat(64)},
  {file:'002_beta.sql', classification:'CANONICAL_COMMERCIAL_DDL', sha256:'b'.repeat(64)}
];

test('manifest catalog must match every ordered plan entry, classification and checksum', () => {
  assert.equal(verifyManifestCatalog(plan.map(item => ({...item})), plan), true);
  assert.throws(() => verifyManifestCatalog([plan[0], plan[0]], plan), /does not match/);
  assert.throws(() => verifyManifestCatalog([plan[1], plan[0]], plan), /does not match/);
  assert.throws(() => verifyManifestCatalog([plan[0]], plan), /differ in length/);
  assert.throws(() => verifyManifestCatalog([plan[0], {...plan[1], classification:'CANONICAL_BASELINE'}], plan), /does not match/);
  assert.throws(() => verifyManifestCatalog([plan[0], {...plan[1], sha256:'c'.repeat(64)}], plan), /does not match/);
});

test('manifest verification rejects a duplicate that hides an omitted migration', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const {pathToFileURL} = await import('node:url');
  const root = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-catalog-integration-'));
  try {
    const sql = path.join(tmp, 'supabase/migrations');
    const docs = path.join(tmp, 'docs/delivery');
    fs.mkdirSync(sql, {recursive:true});
    fs.mkdirSync(docs, {recursive:true});
    // A disposable copy of the pre-integration approved catalog, not a
    // reclassification or execution of the real unreviewed migration.
    for (const file of fs.readdirSync(path.join(root, 'supabase/migrations'))) {
      if (file.endsWith('.sql') && !file.startsWith('20261102080000_')) {
        fs.copyFileSync(path.join(root, 'supabase/migrations', file), path.join(sql, file));
      }
    }
    const manifest = path.join(docs, 'ht-mvp-production-migration-manifest.json');
    fs.copyFileSync(path.join(root, 'docs/delivery/ht-mvp-production-migration-manifest.json'), manifest);
    process.chdir(tmp);
    const url = pathToFileURL(path.join(root, 'scripts/release/ht-migration-governor.mjs')).href;
    const {verifyManifest} = await import(`${url}?isolated-catalog-integration`);
    assert.equal(verifyManifest(), true);
    const altered = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    altered.catalog[1] = {...altered.catalog[0]};
    fs.writeFileSync(manifest, JSON.stringify(altered));
    assert.throws(() => verifyManifest(), /Manifest catalog does not match/);
  } finally {
    process.chdir(root);
    fs.rmSync(tmp, {recursive:true, force:true});
  }
});
