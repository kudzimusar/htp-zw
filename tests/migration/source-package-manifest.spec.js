const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  assertOutsideRepository,
  buildManifest,
  formatFromPath,
  sha256File
} = require('../../scripts/migration/source-package-manifest');

test('builds checksummed repository-safe metadata without leaking filenames or private paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'healthtimes-source-package-'));
  const wordpressDir = path.join(root, 'wordpress', 'database');
  fs.mkdirSync(wordpressDir, { recursive: true });
  const privateFile = path.join(wordpressDir, 'client-production-db.sql.gz');
  fs.writeFileSync(privateFile, 'sanitized-test-fixture');

  const manifest = buildManifest(root, {
    repoDir: process.cwd(),
    snapshotId: 'rehearsal-snapshot-test',
    generatedAt: '2026-09-16T00:00:00.000Z'
  });

  expect(manifest.snapshot_type).toBe('rehearsal');
  expect(manifest.content_freeze_status).toBe('NOT_FROZEN');
  expect(manifest.artifact_count).toBe(1);
  expect(manifest.artifacts[0].safe_identifier).toBe('artifact_0001');
  expect(manifest.artifacts[0].source_system).toBe('wordpress');
  expect(manifest.artifacts[0].sha256).toHaveLength(64);
  expect(manifest.artifacts[0].format).toBe('sql.gz');

  const serialized = JSON.stringify(manifest);
  expect(serialized).not.toContain('client-production-db.sql.gz');
  expect(serialized).not.toContain(root);

  fs.rmSync(root, { recursive: true, force: true });
});

test('refuses a private source package stored inside the repository', () => {
  expect(() => assertOutsideRepository(process.cwd(), process.cwd())).toThrow(/outside the Git repository/);
});

test('checksum and format helpers are deterministic', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'healthtimes-source-checksum-'));
  const file = path.join(root, 'sample.xml');
  fs.writeFileSync(file, '<rss/>');
  expect(sha256File(file)).toBe(sha256File(file));
  expect(formatFromPath(file)).toBe('xml');
  fs.rmSync(root, { recursive: true, force: true });
});
