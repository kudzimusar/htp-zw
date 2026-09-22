const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildMediaRewriteIndex,
  buildPublicUrlManifest,
  buildRehearsal,
  buildTaxonomyDisposition,
  createStagingSql,
  parseDatabase,
  rewriteWordPressUploadUrls,
  storageKeyForOriginalPath,
  splitCells,
  splitRows
} = require('../../scripts/migration/wordpress-database-rehearsal');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ht-ag04-db-'));
}

function writeFixture(root) {
  const sql = [
    'CREATE TABLE `wpyg_posts` (`ID` bigint, `post_author` bigint, `post_date` datetime, `post_date_gmt` datetime, `post_content` longtext, `post_title` text, `post_excerpt` text, `post_status` varchar(20), `comment_status` varchar(20), `ping_status` varchar(20), `post_password` varchar(255), `post_name` varchar(200), `to_ping` text, `pinged` text, `post_modified` datetime, `post_modified_gmt` datetime, `post_content_filtered` longtext, `post_parent` bigint, `guid` varchar(255), `menu_order` int, `post_type` varchar(20), `post_mime_type` varchar(100), `comment_count` bigint);',
    'CREATE TABLE `wpyg_postmeta` (`meta_id` bigint, `post_id` bigint, `meta_key` varchar(255), `meta_value` longtext);',
    'CREATE TABLE `wpyg_users` (`ID` bigint, `user_login` varchar(60), `user_pass` varchar(255), `user_nicename` varchar(50), `user_email` varchar(100), `user_url` varchar(100), `user_registered` datetime, `user_activation_key` varchar(255), `user_status` int, `display_name` varchar(250));',
    'CREATE TABLE `wpyg_terms` (`term_id` bigint, `name` varchar(200), `slug` varchar(200), `term_group` bigint);',
    'CREATE TABLE `wpyg_term_taxonomy` (`term_taxonomy_id` bigint, `term_id` bigint, `taxonomy` varchar(32), `description` longtext, `parent` bigint, `count` bigint);',
    'CREATE TABLE `wpyg_term_relationships` (`object_id` bigint, `term_taxonomy_id` bigint, `term_order` int);',
    "INSERT INTO `wpyg_users` VALUES (1,'michael','x','michael','','','2026-01-01','','0','Michael Gwarisa');",
    "INSERT INTO `wpyg_posts` VALUES (10,1,'2026-09-01 10:00:00','2026-09-01 08:00:00','<p>Body<img src=\"https://healthtimes.co.zw/wp-content/uploads/2026/09/pic.jpg\"></p>[gallery ids=\"11\"]','Story Title','Excerpt','publish','open','open','','story-title','','','2026-09-02 10:00:00','2026-09-02 08:00:00','',0,'https://healthtimes.co.zw/story-title/',0,'post','',0),(11,1,'2026-09-01 09:00:00','2026-09-01 07:00:00','','pic','','inherit','open','open','','pic','','','2026-09-01 09:00:00','2026-09-01 07:00:00','',10,'https://healthtimes.co.zw/wp-content/uploads/2026/09/pic.jpg',0,'attachment','image/jpeg',0),(12,1,'2026-09-03 09:00:00','2026-09-03 07:00:00','<p>About</p>','About','', 'publish','open','open','','about','','','2026-09-03 09:00:00','2026-09-03 07:00:00','',0,'https://healthtimes.co.zw/about/',0,'page','',0);",
    "INSERT INTO `wpyg_postmeta` VALUES (1,10,'_thumbnail_id','11'),(2,11,'_wp_attached_file','2026/09/pic.jpg'),(3,11,'_wp_attachment_metadata','a:2:{s:5:\"width\";i:1200;s:6:\"height\";i:400;}'),(4,11,'_wp_attachment_image_alt','Clinic alt');",
    "INSERT INTO `wpyg_terms` VALUES (1,'Health','health',0),(2,'Testing','testing',0);",
    "INSERT INTO `wpyg_term_taxonomy` VALUES (100,1,'category','',0,1),(101,2,'post_tag','',0,1);",
    "INSERT INTO `wpyg_term_relationships` VALUES (10,100,0),(10,101,0);"
  ].join('\n');
  const file = path.join(root, 'fixture.sql');
  fs.writeFileSync(file, sql);
  fs.writeFileSync(path.join(root, 'tar.txt'), '-rw-r--r--  0 user group 123 Sep  1 10:00 uploads/2026/09/pic.jpg\n');
  return file;
}

test('splits mysqldump rows with quoted commas and escaped content', () => {
  const rows = splitRows("(1,'hello, world'),(2,'it\\'s ok')");
  expect(rows).toHaveLength(2);
  expect(splitCells(rows[0])).toEqual(['1', 'hello, world']);
  expect(splitCells(rows[1])).toEqual(['2', "it's ok"]);
});

test('builds source-counted rehearsal manifests from WordPress SQL', async () => {
  const root = tempDir();
  const file = writeFixture(root);
  const source = await parseDatabase(file, 'wpyg_');
  const rehearsal = buildRehearsal(source, { tarMetadata: path.join(root, 'tar.txt') });
  expect(rehearsal.counts.posts).toBe(1);
  expect(rehearsal.counts.pages).toBe(1);
  expect(rehearsal.counts.media).toBe(1);
  expect(rehearsal.counts.categories).toBe(1);
  expect(rehearsal.counts.tags).toBe(1);
  expect(rehearsal.counts.authors).toBe(1);
  expect(rehearsal.storyExceptions.map(e => e.type)).toContain('shortcode');
  expect(rehearsal.mediaReferences).toHaveLength(1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('emits idempotent staging SQL with WordPress provenance keys', async () => {
  const root = tempDir();
  const file = writeFixture(root);
  const source = await parseDatabase(file, 'wpyg_');
  const rehearsal = buildRehearsal(source, { tarMetadata: path.join(root, 'tar.txt') });
  const sql = createStagingSql(rehearsal, { migrationRunId: 'test-run' });
  expect(sql).toContain("on conflict (stable_key) do update");
  expect(sql).toContain("wordpress:post:10");
  expect(sql).toContain("wordpress:media:11");
  expect(sql).toContain("on conflict (legacy_source_id) do update");
  expect(sql).toContain("200, 'PRESERVE_DIRECTLY'");
  expect(sql).not.toContain("301, 'preserve'");
  fs.rmSync(root, { recursive: true, force: true });
});

test('uses deterministic safe storage keys while preserving source path provenance', () => {
  expect(storageKeyForOriginalPath('uploads/2025/12/DALL·E-photo.webp'))
    .toBe('wordpress/2025/12/DALL-E-photo.webp');
  expect(storageKeyForOriginalPath('uploads/2018/12/HealthTimes-•-Instagram.png'))
    .toBe('wordpress/2018/12/HealthTimes-Instagram.png');
  expect(storageKeyForOriginalPath('uploads/2019/01/Review-–-Fine.jpg'))
    .toBe('wordpress/2019/01/Review-Fine.jpg');
});

test('rewrites WordPress derivatives to canonical attachment storage and records unresolved fallbacks', () => {
  const attachments = [{
    id: '11',
    status: 'pending',
    original_path: 'uploads/2026/09/photo-scaled.jpg',
    storage_key: 'wordpress/2026/09/photo-scaled.jpg',
    public_url: 'https://example.test/migrated-media/wordpress/2026/09/photo-scaled.jpg'
  }, {
    id: '12',
    status: 'pending',
    original_path: 'uploads/2026/09/report-520x1024-1.jpg',
    storage_key: 'wordpress/2026/09/report-520x1024-1.jpg',
    public_url: 'https://example.test/migrated-media/wordpress/2026/09/report-520x1024-1.jpg'
  }];
  const index = buildMediaRewriteIndex(attachments, 'https://example.test/migrated-media');
  const result = rewriteWordPressUploadUrls(
    '<img src="https://healthtimes.co.zw/wp-content/uploads/2026/09/photo-300x200.jpg">' +
    '<img src="https://healthtimes.co.zw/wp-content/uploads/2026/09/report-520x1024.jpg">' +
    '<img src="https://healthtimes.co.zw/wp-content/uploads/2026/09/unattached-300x200.jpg">',
    index
  );
  expect(result.html).toContain('/photo-scaled.jpg');
  expect(result.html).toContain('/report-520x1024-1.jpg');
  expect(result.html).not.toContain('healthtimes.co.zw/wp-content/uploads');
  expect(result.unresolved).toHaveLength(1);
  expect(result.unresolved[0].fallback_key).toBe('wordpress/2026/09/unattached-300x200.jpg');
});

test('emits the exact direct-preservation URL and taxonomy disposition contracts', async () => {
  const root = tempDir();
  const file = writeFixture(root);
  const source = await parseDatabase(file, 'wpyg_');
  const rehearsal = buildRehearsal(source, {
    tarMetadata: path.join(root, 'tar.txt'),
    storagePublicBase: 'https://example.test/migrated-media'
  });
  const urls = buildPublicUrlManifest(rehearsal.stories);
  expect(urls).toHaveLength(2);
  expect(urls.every(item => item.handling === 'PRESERVE_DIRECTLY' && item.HTTP_status === 200)).toBeTruthy();
  const taxonomy = buildTaxonomyDisposition(rehearsal.categories, rehearsal.tags);
  expect(taxonomy.categories[0].mapping_status).toBe('CANONICAL_NAVIGATION_CANDIDATE');
  expect(taxonomy.tags[0].mapping_status).toBe('LEGACY_ONLY');
  fs.rmSync(root, { recursive: true, force: true });
});
