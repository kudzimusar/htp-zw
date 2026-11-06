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
