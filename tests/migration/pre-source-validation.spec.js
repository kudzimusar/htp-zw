const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const {
  validateDatabaseArtifact
} = require('../../scripts/migration/validate-wordpress-database');
const {
  isMalformedArchivePath,
  validateUploadsArtifact
} = require('../../scripts/migration/validate-wordpress-uploads');
const {
  reconcileInventories
} = require('../../scripts/migration/reconcile-source-inventory');
const {
  validateProvenanceReadiness
} = require('../../scripts/migration/validate-provenance-readiness');
const {
  validateSourcePackage
} = require('../../scripts/migration/validate-source-package');

function coreCreate(prefix, omit = []) {
  const defs = {
    posts: ['ID bigint','post_author bigint','post_parent bigint','post_name varchar(200)','guid varchar(255)','post_status varchar(20)','post_type varchar(20)'],
    postmeta: ['meta_id bigint','post_id bigint','meta_key varchar(255)','meta_value longtext'],
    users: ['ID bigint','user_login varchar(60)'],
    usermeta: ['umeta_id bigint','user_id bigint','meta_key varchar(255)','meta_value longtext'],
    terms: ['term_id bigint','name varchar(200)','slug varchar(200)'],
    term_taxonomy: ['term_taxonomy_id bigint','term_id bigint','taxonomy varchar(32)'],
    term_relationships: ['object_id bigint','term_taxonomy_id bigint'],
    options: ['option_id bigint','option_name varchar(191)','option_value longtext'],
    comments: ['comment_ID bigint'],
    commentmeta: ['meta_id bigint'],
    links: ['link_id bigint'],
    termmeta: ['meta_id bigint','term_id bigint']
  };
  return Object.entries(defs)
    .filter(([name]) => !omit.includes(name))
    .map(([name, cols]) => 'CREATE TABLE `' + prefix + name + '` (\n' + cols.map(c => '  `' + c.replace(' ', '` ') + ',').join('\n').replace(/,$/, '') + '\n);')
    .join('\n');
}

function validSql(prefix = 'wp_', extras = true) {
  let sql = coreCreate(prefix);
  sql += '\nINSERT INTO `' + prefix + 'posts` VALUES ' +
    "(1,1,0,'story','https://example.invalid/story/','publish','post')," +
    "(2,1,0,'page','https://example.invalid/page/','publish','page')," +
    "(3,1,0,'image','https://example.invalid/wp-content/uploads/2026/09/image.jpg','inherit','attachment')," +
    "(4,1,0,'order','https://example.invalid/?p=4','wc-completed','shop_order')," +
    "(5,1,0,'subscription','https://example.invalid/?p=5','wc-active','shop_subscription');\n";
  sql += 'INSERT INTO `' + prefix + "postmeta` VALUES (1,1,'_thumbnail_id','3');\n";
  sql += 'INSERT INTO `' + prefix + "users` VALUES (1,'fixture-user');\n";
  sql += 'INSERT INTO `' + prefix + "terms` VALUES (1,'Health','health'),(2,'Zimbabwe','zimbabwe');\n";
  sql += 'INSERT INTO `' + prefix + "term_taxonomy` VALUES (1,1,'category'),(2,2,'post_tag');\n";
  sql += 'INSERT INTO `' + prefix + "options` VALUES (1,'permalink_structure','/%postname%/');\n";
  if (extras) {
    sql += 'CREATE TABLE `' + prefix + 'wc_orders` (\n  `id` bigint\n);\n';
    sql += 'CREATE TABLE `' + prefix + 'woocommerce_subscriptions` (\n  `id` bigint\n);\n';
    sql += 'CREATE TABLE `' + prefix + 'wc_memberships_user_memberships` (\n  `id` bigint\n);\n';
    sql += 'CREATE TABLE `' + prefix + 'woocommerce_payment_tokens` (\n  `token_id` bigint\n);\n';
    sql += 'CREATE TABLE `' + prefix + 'wpforms_entries` (\n  `entry_id` bigint\n);\n';
    sql += 'CREATE TABLE `' + prefix + 'custom_editorial_metrics` (\n  `id` bigint\n);\n';
  }
  return sql;
}

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), label));
}

test('validates plain SQL with alternate WordPress prefix and commerce/provenance signals', async () => {
  const root = tempDir('ht-ag03-db-');
  const file = path.join(root, 'secret-source-name.sql');
  fs.writeFileSync(file, validSql('ht_'));
  const report = await validateDatabaseArtifact(file, { exportTimestamp: '2026-09-19T00:00:00.000Z' });

  expect(report.validation_status).toBe('VALID');
  expect(report.wordpress_table_prefix).toBe('ht_');
  expect(report.missing_essential_core_tables).toEqual([]);
  expect(report.commerce_signals.woocommerce_present).toBe(true);
  expect(report.commerce_signals.subscriptions_present).toBe(true);
  expect(report.commerce_signals.memberships_present).toBe(true);
  expect(report.commerce_signals.payment_tables_present).toBe(true);
  expect(report.table_groups.audience_forms.some(t => t.includes('wpforms'))).toBe(true);
  expect(report.authoritative_inventory).toEqual({
    published_posts: 1,
    pages: 1,
    media: 1,
    categories: 1,
    tags: 1,
    authors_users: 1
  });
  expect(JSON.stringify(report)).not.toContain('secret-source-name.sql');
  expect(JSON.stringify(report)).not.toContain(root);
  fs.rmSync(root, { recursive: true, force: true });
});

test('validates gzip SQL and rejects corrupted gzip', async () => {
  const root = tempDir('ht-ag03-gzip-');
  const good = path.join(root, 'private.sql.gz');
  const bad = path.join(root, 'corrupt.sql.gz');
  fs.writeFileSync(good, zlib.gzipSync(Buffer.from(validSql('wp_', false))));
  fs.writeFileSync(bad, Buffer.from('not-a-gzip-stream'));

  const goodReport = await validateDatabaseArtifact(good);
  const badReport = await validateDatabaseArtifact(bad);
  expect(goodReport.validation_status).toBe('VALID');
  expect(goodReport.gzip_integrity).toBe('PASS');
  expect(badReport.validation_status).toBe('INVALID');
  expect(badReport.gzip_integrity).toBe('FAIL');
  expect(badReport.errors.map(e => e.code)).toContain('GZIP_INTEGRITY_FAILED');
  fs.rmSync(root, { recursive: true, force: true });
});

test('reports missing WordPress core structures and commerce absence conservatively', async () => {
  const root = tempDir('ht-ag03-missing-core-');
  const file = path.join(root, 'fixture.sql');
  fs.writeFileSync(file, coreCreate('wp_', ['users']) + "\nINSERT INTO `wp_posts` VALUES (1,1,0,'story','https://example.invalid/story/','publish','post');\n");
  const report = await validateDatabaseArtifact(file);
  expect(report.validation_status).toBe('INVALID');
  expect(report.missing_essential_core_tables).toContain('wp_users');
  expect(report.commerce_signals.woocommerce_present).toBe(false);
  expect(report.commerce_signals.subscriptions_present).toBe(false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('validates extracted uploads and tar.gz with zero-byte, duplicate and executable signals', () => {
  const root = tempDir('ht-ag03-uploads-');
  const uploads = path.join(root, 'uploads');
  const month = path.join(uploads, '2026', '09');
  fs.mkdirSync(month, { recursive: true });
  fs.writeFileSync(path.join(month, 'photo.jpg'), 'duplicate-image');
  fs.writeFileSync(path.join(month, 'copy.jpg'), 'duplicate-image');
  fs.writeFileSync(path.join(month, 'zero.txt'), '');
  fs.writeFileSync(path.join(month, 'unexpected.php'), '<?php echo 1;');

  const dirReport = validateUploadsArtifact(uploads);
  expect(dirReport.validation_status).toBe('VALID');
  expect(dirReport.metrics.file_count).toBe(4);
  expect(dirReport.metrics.zero_byte_file_count).toBe(1);
  expect(dirReport.metrics.duplicate_hash_groups[0].copies).toBe(2);
  expect(dirReport.metrics.unexpected_script_extensions.php).toBe(1);
  expect(dirReport.metrics.year_month_distribution['2026/09']).toBe(4);

  const archive = path.join(root, 'uploads.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', root, 'uploads']);
  const archiveReport = validateUploadsArtifact(archive);
  expect(archiveReport.validation_status).toBe('VALID');
  expect(archiveReport.archive_integrity).toBe('PASS');
  expect(archiveReport.metrics.file_count).toBe(4);
  expect(JSON.stringify(archiveReport)).not.toContain(root);
  fs.rmSync(root, { recursive: true, force: true });
});

test('detects malformed media archive paths without exposing path values', () => {
  expect(isMalformedArchivePath('../escape.jpg')).toBe(true);
  expect(isMalformedArchivePath('/absolute/file.jpg')).toBe(true);
  expect(isMalformedArchivePath('2026/09/photo.jpg')).toBe(false);
});

test('provenance validator returns READY for sufficient authoritative schema and GAPS otherwise', async () => {
  const root = tempDir('ht-ag03-prov-');
  const file = path.join(root, 'fixture.sql');
  fs.writeFileSync(file, validSql());
  const db = await validateDatabaseArtifact(file);
  const ready = validateProvenanceReadiness(db);
  expect(ready.status).toBe('PROVENANCE_READY');

  const gaps = validateProvenanceReadiness({ validation_status: 'INVALID', provenance_signals: {}, content_signals: {}, commerce_signals: {} });
  expect(gaps.status).toBe('PROVENANCE_GAPS');
  expect(gaps.gaps).toContain('post_page_ids');
  fs.rmSync(root, { recursive: true, force: true });
});

test('inventory reconciler distinguishes match, expected drift, review and missing/database-only states', () => {
  const live = {
    captured_at: '2026-09-19T01:00:00.000Z',
    counts: { published_posts: 2, pages: 1, media: 1, categories: 1, tags: 1, authors_users: null }
  };
  const db = {
    export_timestamp: '2026-09-19T00:00:00.000Z',
    authoritative_inventory: { published_posts: 1, pages: 1, media: 2, categories: 1, tags: null, authors_users: 1 }
  };
  const report = reconcileInventories(live, db);
  expect(report.items.published_posts.classification).toBe('EXPECTED_SOURCE_DRIFT');
  expect(report.items.pages.classification).toBe('MATCH');
  expect(report.items.media.classification).toBe('REQUIRES_REVIEW');
  expect(report.items.tags.classification).toBe('MISSING_FROM_DATABASE');
  expect(report.items.authors_users.classification).toBe('DATABASE_ONLY');
  expect(report.status).toBe('RECONCILIATION_INCOMPLETE');
});

test('unified source validation distinguishes missing artifacts and fully valid synthetic package', async () => {
  const missingRoot = tempDir('ht-ag03-unified-missing-');
  const missing = await validateSourcePackage(missingRoot, {
    repoDir: process.cwd(),
    liveInventory: null
  });
  expect(missing.status).toBe('ARTIFACT_MISSING');
  fs.rmSync(missingRoot, { recursive: true, force: true });

  const root = tempDir('ht-ag03-unified-valid-');
  const wordpress = path.join(root, 'wordpress');
  const uploads = path.join(wordpress, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'asset.jpg'), 'safe-fixture');
  fs.writeFileSync(path.join(wordpress, 'snapshot.sql'), validSql());
  const liveFile = path.join(root, 'live-inventory.json');
  fs.writeFileSync(liveFile, JSON.stringify({
    captured_at: '2026-09-19T00:00:00.000Z',
    counts: { published_posts: 1, pages: 1, media: 1, categories: 1, tags: 1, authors_users: 1 }
  }));
  const valid = await validateSourcePackage(root, {
    repoDir: process.cwd(),
    liveInventory: liveFile,
    exportTimestamp: '2026-09-19T00:00:00.000Z'
  });
  expect(valid.status).toBe('SOURCE_VALIDATION_READY');
  const serialized = JSON.stringify(valid);
  expect(serialized).not.toContain(root);
  expect(serialized).not.toContain('snapshot.sql');
  expect(serialized).not.toContain('asset.jpg');
  fs.rmSync(root, { recursive: true, force: true });
});
