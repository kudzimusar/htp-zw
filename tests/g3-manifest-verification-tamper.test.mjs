import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifyManifest, generateManifest } from '../scripts/web/verify-vercel-manifest.mjs';

const ROOT_DIR = process.cwd();
const LIVE_OUTPUT_DIR = path.join(ROOT_DIR, '.vercel/output');
const LIVE_MANIFEST_PATH = path.join(ROOT_DIR, '.vercel/package-manifest.json');

// Helper to construct a clean minimal compliant artifact fixture
function createCompliantFixture(tmpDir, customBuildInfo = {}) {
  const outputDir = path.join(tmpDir, 'output');
  const manifestPath = path.join(tmpDir, 'package-manifest.json');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'static/assets'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/public.func'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/newsroom.func/api'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/communications.func/api'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/commerce.func/api'), { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'config.json'), '{"version":3}\n');
  fs.writeFileSync(path.join(outputDir, 'static/index.html'), '<!DOCTYPE html><html><head><title>HealthTimes</title></head><body><h1>HealthTimes</h1></body></html>\n');
  fs.writeFileSync(path.join(outputDir, 'static/manifest.json'), '{"name":"HealthTimes","short_name":"HealthTimes","start_url":"/"}\n');
  fs.writeFileSync(path.join(outputDir, 'static/sw.js'), '// sw.js\n');
  fs.writeFileSync(path.join(outputDir, 'static/healthtimes-icon.svg'), '<svg></svg>\n');
  fs.writeFileSync(path.join(outputDir, 'static/assets/app.js'), 'console.log("HealthTimes");\n');
  fs.writeFileSync(path.join(outputDir, 'functions/api/public.func/.vc-config.json'), '{"runtime":"nodejs20.x"}\n');
  fs.writeFileSync(path.join(outputDir, 'functions/api/public.func/index.js'), 'module.exports = () => {};\n');
  fs.writeFileSync(path.join(outputDir, 'functions/api/newsroom.func/api/newsroom.js'), 'module.exports = () => {};\n');
  fs.writeFileSync(path.join(outputDir, 'functions/api/communications.func/api/communications.js'), 'module.exports = () => {};\n');
  fs.writeFileSync(path.join(outputDir, 'functions/api/commerce.func/api/commerce.js'), 'module.exports = () => {};\n');

  const buildInfo = {
    sha: 'fixture-test-sha-1234567890abcdef',
    serviceMode: 'source-parity',
    previewLocked: true,
    ...customBuildInfo
  };
  fs.writeFileSync(path.join(outputDir, 'static/build-info.json'), JSON.stringify(buildInfo, null, 2) + '\n');

  generateManifest(outputDir, manifestPath);

  return { outputDir, manifestPath, expectedSha: buildInfo.sha };
}

test('G3 Manifest Verification Fail-Closed Tampering & Negative Controls', async (t) => {
  // Ensure test runs in test mode so failVerification throws rather than exiting
  process.env.NODE_ENV = 'test';

  const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'g3-manifest-test-'));

  t.after(() => {
    try {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch {}
  });

  // 1. Positive baseline check on hermetic fixture
  await t.test('1. Baseline untouched compliant fixture passes verification', () => {
    const fixtureDir = path.join(testTmpDir, 'baseline');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);
    const valid = verifyManifest({ outputDir, manifestPath, expectedSha });
    assert.equal(valid, true);
  });

  // 2. Tampering file content in artifact
  await t.test('2. Byte tampering in packaged file triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'byte-tamper');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    // Tamper a single byte in index.html
    const targetFile = path.join(outputDir, 'static/index.html');
    fs.appendFileSync(targetFile, '<!-- injected tampered byte -->\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /File byte hash mismatch/);
  });

  // 3. Tampering build-info.json commit SHA
  await t.test('3. Commit SHA mismatch in build-info.json triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'sha-mismatch');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfo.sha = '0000000000000000000000000000000000000000';
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /build-info\.json SHA mismatch/);
  });

  // 4. Malformed build-info.json
  await t.test('4. Malformed JSON in build-info.json triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'malformed-json');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    fs.writeFileSync(buildInfoPath, '{ corrupt_json::: invalid syntax');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /malformed JSON/);
  });

  // 5. Missing required baseline file
  await t.test('5. Missing required baseline file triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'missing-file');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const swPath = path.join(outputDir, 'static/sw.js');
    fs.unlinkSync(swPath);

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /Required baseline file missing: static\/sw\.js/);
  });

  // 6. Extraneous untracked file in artifact
  await t.test('6. Extraneous untracked file triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'untracked-file');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const injectedPath = path.join(outputDir, 'static/backdoor-payload.js');
    fs.writeFileSync(injectedPath, 'console.log("backdoor");\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /Untracked extraneous file detected: static\/backdoor-payload\.js/);
  });

  // 7. Tampered manifest aggregate digest
  await t.test('7. Tampered manifest aggregate digest triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'tampered-digest');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.aggregateDigest = '0000000000000000000000000000000000000000000000000000000000000000';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /Aggregate digest mismatch/);
  });

  // 8. Service mode validation
  await t.test('8. Incorrect service mode triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'bad-service-mode');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfo.serviceMode = 'production';
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha });
    }, /build-info\.json serviceMode must be 'source-parity'/);
  });

  // 9. Read-only preservation proof
  await t.test('9. Read-only verification does not mutate manifest file', () => {
    const fixtureDir = path.join(testTmpDir, 'readonly-preservation');
    const { outputDir, manifestPath, expectedSha } = createCompliantFixture(fixtureDir);

    const contentBefore = fs.readFileSync(manifestPath, 'utf8');
    verifyManifest({ outputDir, manifestPath, expectedSha });
    const contentAfter = fs.readFileSync(manifestPath, 'utf8');

    assert.equal(contentBefore, contentAfter, 'Manifest content must remain byte-for-byte identical after verification');
  });

  // 10. Live workspace output verification (if packaged output exists)
  await t.test('10. Live workspace .vercel/output verification (if present)', () => {
    if (fs.existsSync(LIVE_OUTPUT_DIR) && fs.existsSync(LIVE_MANIFEST_PATH)) {
      const valid = verifyManifest({ outputDir: LIVE_OUTPUT_DIR, manifestPath: LIVE_MANIFEST_PATH });
      assert.equal(valid, true, 'Live packaged artifact must pass verification');
    }
  });
});
