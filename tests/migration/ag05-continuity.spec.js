const { test, expect } = require('@playwright/test');
const {
  EXPECTED_TOTAL,
  validateManifest,
  buildArtifacts
} = require('../../scripts/migration/ag05-url-continuity');

function completeManifest() {
  const records = [];
  for (let i = 0; i < 5737; i += 1) {
    const url = `https://healthtimes.co.zw/post-${i}/`;
    records.push({
      source_url: url,
      source_object_id: String(i + 1),
      source_object_type: 'post',
      destination_url: url,
      handling: 'PRESERVE_DIRECTLY',
      HTTP_status: 200,
      canonical_url: url,
      reason: 'Preserve source post-name permalink.',
      verification_status: 'VERIFIED'
    });
  }
  for (let i = 0; i < 49; i += 1) {
    const url = `https://healthtimes.co.zw/page-${i}/`;
    records.push({
      source_url: url,
      source_object_id: String(100000 + i),
      source_object_type: 'page',
      destination_url: url,
      handling: 'PRESERVE_DIRECTLY',
      HTTP_status: 200,
      canonical_url: url,
      reason: 'Preserve source page permalink.',
      verification_status: 'VERIFIED'
    });
  }
  return records;
}

test('AG-05 URL contract requires exact CP3 public-object coverage', () => {
  const validation = validateManifest(completeManifest());
  expect(validation.ok).toBe(true);
  expect(validation.summary.records).toBe(EXPECTED_TOTAL);
  expect(validation.summary.posts).toBe(5737);
  expect(validation.summary.pages).toBe(49);
  expect(validation.summary.unverified).toBe(0);
});

test('AG-05 URL contract fails when even one public object is missing', () => {
  const records = completeManifest();
  records.pop();
  const validation = validateManifest(records);
  expect(validation.ok).toBe(false);
  expect(validation.errors.join('\n')).toContain('page coverage is 48; expected 49');
  expect(validation.errors.join('\n')).toContain('public URL coverage is 5785; expected 5786');
});

test('AG-05 URL contract rejects redirect chains', () => {
  const records = completeManifest();
  records[0] = {
    ...records[0],
    handling: '301_REDIRECT',
    HTTP_status: 301,
    destination_url: records[1].source_url,
    canonical_url: records[2].source_url,
    reason: 'Synthetic redirect.'
  };
  records[1] = {
    ...records[1],
    handling: '301_REDIRECT',
    HTTP_status: 301,
    destination_url: records[2].source_url,
    canonical_url: records[2].source_url,
    reason: 'Synthetic redirect.'
  };
  const validation = validateManifest(records);
  expect(validation.ok).toBe(false);
  expect(validation.errors.some(error => error.includes('redirect chain detected'))).toBe(true);
});

test('AG-05 URL contract rejects catch-all redirects to the homepage', () => {
  const records = completeManifest();
  records[0] = {
    ...records[0],
    handling: '301_REDIRECT',
    HTTP_status: 301,
    destination_url: 'https://healthtimes.co.zw/',
    canonical_url: 'https://healthtimes.co.zw/',
    reason: 'Synthetic invalid redirect.'
  };
  const validation = validateManifest(records);
  expect(validation.ok).toBe(false);
  expect(validation.errors.some(error => error.includes('catch-all redirect to homepage is prohibited'))).toBe(true);
});

test('AG-05 generated artifacts preserve /feed/ and protect internal routes', () => {
  const validation = validateManifest(completeManifest());
  const artifacts = buildArtifacts(validation.records);
  expect(artifacts.feedPolicy.source_feed).toBe('https://healthtimes.co.zw/feed/');
  expect(artifacts.feedPolicy.destination_path).toBe('/feed/');
  expect(artifacts.productionRobots).toContain('Disallow: /newsroom/');
  expect(artifacts.productionRobots).toContain('Sitemap: https://healthtimes.co.zw/sitemap.xml');
  expect(artifacts.sitemap).toContain('https://healthtimes.co.zw/post-0/');
});
