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
  fetchLiveInventory,
  reconcileInventories
} = require('../../scripts/migration/reconcile-source-inventory');
const {
  validateProvenanceReadiness
} = require('../../scripts/migration/validate-provenance-readiness');
const {
  discoverArtifacts,
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

function cpanelStyleSql(prefix = 'cp_') {
  return [
    '-- MySQL dump 10.13  Distrib 8.0.x, for Linux (x86_64)',
    '-- Host: localhost    Database: synthetic_healthtimes',
    '/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;',
    '/*!40101 SET NAMES utf8mb4 */;',
    'SET FOREIGN_KEY_CHECKS=0;',
    ...coreCreate(prefix).split('\n'),
    'DROP TABLE IF EXISTS `' + prefix + 'wc_orders`;',
    'CREATE TABLE `' + prefix + 'wc_orders` (',
    '  `id` bigint NOT NULL,',
    '  `status` varchar(20) DEFAULT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
    'DROP TABLE IF EXISTS `' + prefix + 'woocommerce_subscriptions`;',
    'CREATE TABLE `' + prefix + 'woocommerce_subscriptions` (',
    '  `id` bigint NOT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
    'LOCK TABLES `' + prefix + 'posts` WRITE;',
    'INSERT INTO `' + prefix + 'posts` VALUES',
    "(10,2,0,'cpanel-story','https://example.invalid/cpanel-story/','publish','post'),",
    "(11,2,0,'cpanel-page','https://example.invalid/cpanel-page/','publish','page'),",
    "(12,2,0,'cpanel-image','https://example.invalid/wp-content/uploads/2026/09/cpanel.jpg','inherit','attachment');",
    'UNLOCK TABLES;',
    'LOCK TABLES `' + prefix + 'postmeta` WRITE;',
    "INSERT INTO `" + prefix + "postmeta` VALUES (1,10,'_thumbnail_id','12');",
    'UNLOCK TABLES;',
    'LOCK TABLES `' + prefix + 'users` WRITE;',
    "INSERT INTO `" + prefix + "users` VALUES (2,'private-row-marker-should-not-leak');",
    'UNLOCK TABLES;',
    'LOCK TABLES `' + prefix + 'terms` WRITE;',
    "INSERT INTO `" + prefix + "terms` VALUES (1,'Health','health'),(2,'Zimbabwe','zimbabwe');",
    'UNLOCK TABLES;',
    'LOCK TABLES `' + prefix + 'term_taxonomy` WRITE;',
    "INSERT INTO `" + prefix + "term_taxonomy` VALUES (1,1,'category'),(2,2,'post_tag');",
    'UNLOCK TABLES;',
    'LOCK TABLES `' + prefix + 'options` WRITE;',
    "INSERT INTO `" + prefix + "options` VALUES (1,'permalink_structure','/%postname%/');",
    'UNLOCK TABLES;',
    '/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;',
    'SET FOREIGN_KEY_CHECKS=1;'
  ].join('\n');
}

function multiPrefixSql() {
  let sql = validSql('wprq_', false);
  sql += '\n' + coreCreate('wpyg_');
  sql += '\nINSERT INTO `wpyg_posts` VALUES ' +
    "(101,1,0,'live-one','https://example.invalid/live-one/','publish','post')," +
    "(102,2,0,'live-two','https://example.invalid/live-two/','publish','post')," +
    "(103,1,0,'live-page','https://example.invalid/live-page/','publish','page')," +
    "(104,1,0,'live-image','https://example.invalid/wp-content/uploads/2026/09/live.jpg','inherit','attachment');\n";
  sql += "INSERT INTO `wpyg_postmeta` VALUES (1,101,'_thumbnail_id','104');\n";
  sql += "INSERT INTO `wpyg_users` VALUES (1,'one'),(2,'two');\n";
  sql += "INSERT INTO `wpyg_terms` VALUES (1,'Health','health'),(2,'Zimbabwe','zimbabwe');\n";
  sql += "INSERT INTO `wpyg_term_taxonomy` VALUES (1,1,'category'),(2,2,'post_tag');\n";
  sql += "INSERT INTO `wpyg_options` VALUES (1,'permalink_structure','/%postname%/');\n";
  return sql;
}

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), label));
}

function commandExists(name) {
  try {
    execFileSync('sh', ['-c', 'command -v ' + name], { stdio: ['ignore','ignore','ignore'] });
    return true;
  } catch {
    return false;
  }
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

test('consumes cPanel/phpMyAdmin/mysqldump-style SQL without exposing row contents', async () => {
  const root = tempDir('ht-ag03-cpanel-');
  const file = path.join(root, 'cpanel-synthetic.sql');
  fs.writeFileSync(file, cpanelStyleSql('cp_'));
  const report = await validateDatabaseArtifact(file);
  const serialized = JSON.stringify(report);

  expect(report.validation_status).toBe('VALID');
  expect(report.wordpress_table_prefix).toBe('cp_');
  expect(report.commerce_signals.woocommerce_present).toBe(true);
  expect(report.commerce_signals.subscriptions_present).toBe(true);
  expect(report.authoritative_inventory.published_posts).toBe(1);
  expect(report.authoritative_inventory.pages).toBe(1);
  expect(report.authoritative_inventory.media).toBe(1);
  expect(serialized).not.toContain('private-row-marker-should-not-leak');
  expect(serialized).not.toContain('cpanel-synthetic.sql');
  expect(serialized).not.toContain(root);
  fs.rmSync(root, { recursive: true, force: true });
});

test('automatic prefix detection rejects indistinguishable complete WordPress prefix families', async () => {
  const root = tempDir('ht-ag03-prefix-ambiguous-');
  const file = path.join(root, 'multi-prefix.sql');
  fs.writeFileSync(file, validSql('wprq_', false) + '\n' + validSql('wpyg_', false));

  const report = await validateDatabaseArtifact(file);
  expect(report.validation_status).toBe('INVALID');
  expect(report.wordpress_table_prefix).toBeNull();
  expect(report.wordpress_prefix_selection_source).toBe('AUTO_AMBIGUOUS');
  expect(report.wordpress_prefix_candidate_count).toBe(2);
  expect(report.errors.map(e => e.code)).toContain('WORDPRESS_PREFIX_AMBIGUOUS');
  fs.rmSync(root, { recursive: true, force: true });
});

test('explicit WordPress prefix is selected before INSERT classification and drives counts', async () => {
  const root = tempDir('ht-ag03-prefix-explicit-');
  const file = path.join(root, 'multi-prefix.sql');
  fs.writeFileSync(file, multiPrefixSql());

  const report = await validateDatabaseArtifact(file, { wordpressPrefix: 'wpyg_' });
  expect(report.validation_status).toBe('VALID');
  expect(report.wordpress_table_prefix).toBe('wpyg_');
  expect(report.wordpress_prefix_selection_source).toBe('WP_CONFIG_EXPLICIT');
  expect(report.authoritative_inventory).toEqual({
    published_posts: 2,
    pages: 1,
    media: 1,
    categories: 1,
    tags: 1,
    authors_users: 2
  });
  expect(report.content_signals.featured_media_relationships).toBe(true);
  expect(report.content_signals.permalink_structure_key_seen).toBe(true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('explicit incomplete WordPress prefix is rejected without falling back to another family', async () => {
  const root = tempDir('ht-ag03-prefix-incomplete-');
  const file = path.join(root, 'multi-prefix.sql');
  fs.writeFileSync(file, validSql('wprq_', false) + '\n' + coreCreate('wpyg_', ['users']));

  const report = await validateDatabaseArtifact(file, { wordpressPrefix: 'wpyg_' });
  expect(report.validation_status).toBe('INVALID');
  expect(report.wordpress_table_prefix).toBe('wpyg_');
  expect(report.wordpress_prefix_selection_source).toBe('WP_CONFIG_EXPLICIT');
  expect(report.missing_essential_core_tables).toContain('wpyg_users');
  expect(report.errors.map(e => e.code)).toContain('MISSING_ESSENTIAL_WORDPRESS_CORE');
  fs.rmSync(root, { recursive: true, force: true });
});

test('PHP in uploads is valid only with mandatory review', () => {
  const root = tempDir('ht-ag03-uploads-script-');
  const uploads = path.join(root, 'uploads');
  const month = path.join(uploads, '2026', '09');
  fs.mkdirSync(month, { recursive: true });
  fs.writeFileSync(path.join(month, 'photo.jpg'), 'image');
  fs.writeFileSync(path.join(month, 'unexpected.php'), '<?php echo 1;');

  const report = validateUploadsArtifact(uploads);
  expect(report.validation_status).toBe('VALID_REQUIRES_REVIEW');
  expect(report.metrics.unexpected_script_extensions.php).toBe(1);
  expect(report.security_findings.map(f => f.code)).toContain('UNEXPECTED_EXECUTABLE_OR_SCRIPT_IN_UPLOADS');
  expect(JSON.stringify(report)).not.toContain('unexpected.php');
  expect(JSON.stringify(report)).not.toContain(root);
  fs.rmSync(root, { recursive: true, force: true });
});

test('ordinary uploads archive remains valid with zero-byte and duplicate metadata', () => {
  const root = tempDir('ht-ag03-uploads-ordinary-');
  const uploads = path.join(root, 'uploads');
  const month = path.join(uploads, '2026', '09');
  fs.mkdirSync(month, { recursive: true });
  fs.writeFileSync(path.join(month, 'photo.jpg'), 'duplicate-image');
  fs.writeFileSync(path.join(month, 'copy.jpg'), 'duplicate-image');
  fs.writeFileSync(path.join(month, 'zero.txt'), '');

  const archive = path.join(root, 'uploads.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', root, 'uploads']);
  const report = validateUploadsArtifact(archive);
  expect(report.validation_status).toBe('VALID');
  expect(report.archive_integrity).toBe('PASS');
  expect(report.metrics.file_count).toBe(3);
  expect(report.metrics.zero_byte_file_count).toBe(1);
  expect(report.metrics.duplicate_hash_groups[0].copies).toBe(2);
  expect(report.metrics.year_month_distribution['2026/09']).toBe(3);
  fs.rmSync(root, { recursive: true, force: true });
});


test('large uploads archive listing beyond the legacy child-process buffer validates successfully', () => {
  const root = tempDir('ht-ag03-uploads-large-listing-');
  const month = path.join(root, 'uploads', '2026', '09');
  fs.mkdirSync(month, { recursive: true });

  const fileCount = 4500;
  for (let i = 0; i < fileCount; i += 1) {
    const name = 'asset-' + String(i).padStart(5, '0') + '-' + 'x'.repeat(210) + '.jpg';
    fs.writeFileSync(path.join(month, name), 'x');
  }

  const archive = path.join(root, 'large-listing.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', root, 'uploads']);
  const report = validateUploadsArtifact(archive);

  expect(report.validation_status).toBe('VALID');
  expect(report.archive_integrity).toBe('PASS');
  expect(report.metrics.file_count).toBe(fileCount);
  expect(report.errors.map(e => e.code)).not.toContain('ARCHIVE_LIST_FAILED');
  fs.rmSync(root, { recursive: true, force: true });
});

test('tar symlink and hardlink members are rejected before extraction', () => {
  const root = tempDir('ht-ag03-links-');
  const uploads = path.join(root, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  const original = path.join(uploads, 'original.jpg');
  fs.writeFileSync(original, 'image');
  fs.symlinkSync('original.jpg', path.join(uploads, 'symlink.jpg'));
  fs.linkSync(original, path.join(uploads, 'hardlink.jpg'));
  const archive = path.join(root, 'links.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', root, 'uploads']);

  const report = validateUploadsArtifact(archive);
  expect(report.validation_status).toBe('INVALID');
  expect(report.archive_integrity).toBe('FAIL');
  expect(report.security_findings.map(f => f.code)).toContain('ARCHIVE_LINK_ENTRY_REJECTED');
  expect(report.archive_member_safety.symlink_count).toBeGreaterThan(0);
  expect(report.archive_member_safety.hardlink_count).toBeGreaterThan(0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('ZIP symlink is rejected when ZIP symlink metadata is supported', () => {
  test.skip(!commandExists('zip'), 'zip command not available on runner');
  const root = tempDir('ht-ag03-zip-link-');
  const uploads = path.join(root, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'original.jpg'), 'image');
  fs.symlinkSync('original.jpg', path.join(uploads, 'symlink.jpg'));
  const archive = path.join(root, 'links.zip');
  execFileSync('zip', ['-qry', '-y', archive, 'uploads'], { cwd: root });

  const report = validateUploadsArtifact(archive);
  expect(report.validation_status).toBe('INVALID');
  expect(report.security_findings.map(f => f.code)).toContain('ARCHIVE_LINK_ENTRY_REJECTED');
  expect(report.archive_member_safety.symlink_count).toBeGreaterThan(0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('detects malformed media archive paths without exposing path values', () => {
  expect(isMalformedArchivePath('../escape.jpg')).toBe(true);
  expect(isMalformedArchivePath('/absolute/file.jpg')).toBe(true);
  expect(isMalformedArchivePath('2026/09/photo.jpg')).toBe(false);
});

test('public REST user 401 does not discard five core content counts', async () => {
  const originalFetch = global.fetch;
  const totals = { posts: 100, pages: 10, media: 50, categories: 7, tags: 20 };
  global.fetch = async url => {
    const endpoint = new URL(url).pathname.split('/').pop();
    if (endpoint === 'users') return { ok: false, status: 401, json: async () => ({}) };
    return {
      ok: true,
      status: 200,
      json: async () => ({ headers: { 'X-WP-Total': String(totals[endpoint]) } })
    };
  };
  try {
    const live = await fetchLiveInventory('https://example.invalid/wp-json/wp/v2');
    expect(live.counts).toEqual({
      published_posts: 100,
      pages: 10,
      media: 50,
      categories: 7,
      tags: 20,
      authors_users: null
    });
    expect(live.availability.core_content).toBe('AVAILABLE');
    expect(live.availability.authors_users).toBe('UNAVAILABLE_FROM_PUBLIC_REST');
    expect(live.author_rest_status).toBe('UNAVAILABLE_HTTP_401');
  } finally {
    global.fetch = originalFetch;
  }
});

test('sanitized admin user count explicitly supplements blocked public users endpoint', async () => {
  const originalFetch = global.fetch;
  let usersRequested = false;
  global.fetch = async url => {
    const endpoint = new URL(url).pathname.split('/').pop();
    if (endpoint === 'users') {
      usersRequested = true;
      return { ok: false, status: 401, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({ headers: { 'x-wp-total': '1' } }) };
  };
  try {
    const live = await fetchLiveInventory('https://example.invalid/wp-json/wp/v2', { adminUserCount: 3 });
    expect(live.counts.authors_users).toBe(3);
    expect(live.author_count_source).toBe('SANITIZED_ADMIN_CAPTURE');
    expect(usersRequested).toBe(false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('inventory reconciler separates core reconciliation from unavailable author count', () => {
  const live = {
    captured_at: '2026-09-19T01:00:00.000Z',
    availability: { core_content: 'AVAILABLE', authors_users: 'UNAVAILABLE_FROM_PUBLIC_REST' },
    author_count_source: 'UNAVAILABLE_FROM_PUBLIC_REST',
    counts: { published_posts: 1, pages: 1, media: 1, categories: 1, tags: 1, authors_users: null }
  };
  const db = {
    export_timestamp: '2026-09-19T00:00:00.000Z',
    authoritative_inventory: { published_posts: 1, pages: 1, media: 1, categories: 1, tags: 1, authors_users: 1 }
  };
  const report = reconcileInventories(live, db);
  expect(report.core_content_status).toBe('CORE_CONTENT_RECONCILED');
  expect(report.author_count_status).toBe('AUTHOR_COUNT_REQUIRES_PRIVATE_OR_ADMIN_EVIDENCE');
  expect(report.items.authors_users.classification).toBe('UNAVAILABLE_FROM_PUBLIC_REST');
  expect(report.status).toBe('CORE_CONTENT_RECONCILED');
});

test('inventory reconciler still classifies non-author source drift and review states', () => {
  const live = {
    captured_at: '2026-09-19T01:00:00.000Z',
    counts: { published_posts: 2, pages: 1, media: 1, categories: 1, tags: 1, authors_users: 1 }
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
  expect(report.items.authors_users.classification).toBe('MATCH');
  expect(report.status).toBe('RECONCILIATION_INCOMPLETE');
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

test('artifact ambiguity is explicit and repository-safe', async () => {
  const root = tempDir('ht-ag03-ambiguous-');
  const wordpress = path.join(root, 'wordpress');
  const uploads = path.join(wordpress, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'asset.jpg'), 'asset');
  fs.writeFileSync(path.join(wordpress, 'first.sql'), validSql());
  fs.writeFileSync(path.join(wordpress, 'second.sql'), validSql());

  const discovered = discoverArtifacts(root, {});
  expect(discovered.discovery.database.selection_status).toBe('AMBIGUOUS');
  expect(discovered.discovery.database.candidate_count).toBe(2);

  const report = await validateSourcePackage(root, { repoDir: process.cwd() });
  expect(report.status).toBe('ARTIFACT_AMBIGUOUS');
  expect(report.hard_gates[0]).toMatchObject({
    gate: 'authoritative_database',
    status: 'ARTIFACT_AMBIGUOUS',
    candidate_count: 2,
    source_class: 'WORDPRESS',
    artifact_role: 'AUTHORITATIVE_WORDPRESS_DATABASE'
  });
  const serialized = JSON.stringify(report);
  expect(serialized).not.toContain('first.sql');
  expect(serialized).not.toContain('second.sql');
  expect(serialized).not.toContain(root);
  fs.rmSync(root, { recursive: true, force: true });
});

test('explicit database selection resolves ambiguity without leaking selection path', async () => {
  const root = tempDir('ht-ag03-ambiguous-override-');
  const wordpress = path.join(root, 'wordpress');
  const uploads = path.join(wordpress, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'asset.jpg'), 'asset');
  const first = path.join(wordpress, 'first.sql');
  fs.writeFileSync(first, validSql());
  fs.writeFileSync(path.join(wordpress, 'second.sql'), validSql());
  const liveFile = path.join(root, 'live-inventory.json');
  fs.writeFileSync(liveFile, JSON.stringify({
    captured_at: '2026-09-19T00:00:00.000Z',
    counts: { published_posts: 1, pages: 1, media: 1, categories: 1, tags: 1, authors_users: 1 }
  }));

  const report = await validateSourcePackage(root, {
    repoDir: process.cwd(),
    database: first,
    liveInventory: liveFile,
    exportTimestamp: '2026-09-19T00:00:00.000Z'
  });
  expect(report.status).toBe('SOURCE_VALIDATION_READY');
  expect(report.discovery.database.selection_status).toBe('EXPLICIT_OVERRIDE');
  expect(JSON.stringify(report)).not.toContain(first);
  fs.rmSync(root, { recursive: true, force: true });
});


test('unified validator propagates explicit WordPress prefix through multi-prefix database validation', async () => {
  const root = tempDir('ht-ag03-unified-prefix-');
  const wordpress = path.join(root, 'wordpress');
  const uploads = path.join(wordpress, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'asset.jpg'), 'asset');
  fs.writeFileSync(path.join(wordpress, 'snapshot.sql'), multiPrefixSql());
  const liveFile = path.join(root, 'live-inventory.json');
  fs.writeFileSync(liveFile, JSON.stringify({
    captured_at: '2026-09-21T00:00:00.000Z',
    counts: { published_posts: 2, pages: 1, media: 1, categories: 1, tags: 1, authors_users: 2 }
  }));

  const report = await validateSourcePackage(root, {
    repoDir: process.cwd(),
    liveInventory: liveFile,
    exportTimestamp: '2026-09-21T00:00:00.000Z',
    wordpressPrefix: 'wpyg_'
  });
  expect(report.status).toBe('SOURCE_VALIDATION_READY');
  expect(report.database.wordpress_table_prefix).toBe('wpyg_');
  expect(report.database.wordpress_prefix_selection_source).toBe('WP_CONFIG_EXPLICIT');
  expect(report.database.authoritative_inventory.published_posts).toBe(2);
  fs.rmSync(root, { recursive: true, force: true });
});

test('uploads review finding prevents SOURCE_VALIDATION_READY', async () => {
  const root = tempDir('ht-ag03-review-gate-');
  const wordpress = path.join(root, 'wordpress');
  const uploads = path.join(wordpress, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'asset.jpg'), 'asset');
  fs.writeFileSync(path.join(uploads, 'unexpected.php'), '<?php');
  fs.writeFileSync(path.join(wordpress, 'snapshot.sql'), validSql());
  const liveFile = path.join(root, 'live-inventory.json');
  fs.writeFileSync(liveFile, JSON.stringify({
    captured_at: '2026-09-19T00:00:00.000Z',
    counts: { published_posts: 1, pages: 1, media: 1, categories: 1, tags: 1, authors_users: 1 }
  }));

  const report = await validateSourcePackage(root, {
    repoDir: process.cwd(),
    liveInventory: liveFile,
    exportTimestamp: '2026-09-19T00:00:00.000Z'
  });
  expect(report.status).toBe('ARTIFACT_VALID_RECONCILIATION_INCOMPLETE');
  expect(report.review_gates[0].status).toBe('VALID_REQUIRES_REVIEW');
  fs.rmSync(root, { recursive: true, force: true });
});

test('unified validator exposes core reconciled while author count awaits private/admin evidence', async () => {
  const root = tempDir('ht-ag03-author-fallback-');
  const wordpress = path.join(root, 'wordpress');
  const uploads = path.join(wordpress, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'asset.jpg'), 'asset');
  fs.writeFileSync(path.join(wordpress, 'snapshot.sql'), validSql());
  const liveFile = path.join(root, 'live-inventory.json');
  fs.writeFileSync(liveFile, JSON.stringify({
    captured_at: '2026-09-19T00:00:00.000Z',
    availability: { core_content: 'AVAILABLE', authors_users: 'UNAVAILABLE_FROM_PUBLIC_REST' },
    author_count_source: 'UNAVAILABLE_FROM_PUBLIC_REST',
    counts: { published_posts: 1, pages: 1, media: 1, categories: 1, tags: 1, authors_users: null }
  }));

  const report = await validateSourcePackage(root, {
    repoDir: process.cwd(),
    liveInventory: liveFile,
    exportTimestamp: '2026-09-19T00:00:00.000Z'
  });
  expect(report.status).toBe('ARTIFACT_VALID_RECONCILIATION_INCOMPLETE');
  expect(report.reconciliation_core_status).toBe('CORE_CONTENT_RECONCILED');
  expect(report.author_count_status).toBe('AUTHOR_COUNT_REQUIRES_PRIVATE_OR_ADMIN_EVIDENCE');
  fs.rmSync(root, { recursive: true, force: true });
});

test('unified source validation distinguishes missing artifacts and fully valid synthetic package', async () => {
  const missingRoot = tempDir('ht-ag03-unified-missing-');
  const missing = await validateSourcePackage(missingRoot, { repoDir: process.cwd() });
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
