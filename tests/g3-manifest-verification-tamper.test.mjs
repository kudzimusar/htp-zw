import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { verifyManifest, generateManifest } from '../scripts/web/verify-vercel-manifest.mjs';

const ROOT_DIR = process.cwd();
const LIVE_OUTPUT_DIR = path.join(ROOT_DIR, '.vercel/output');
const LIVE_MANIFEST_PATH = path.join(ROOT_DIR, '.vercel/package-manifest.json');
const PREVIEW_BARRIER_PATH = path.join(ROOT_DIR, 'api/preview-barrier.js');

const barrierContent = fs.readFileSync(PREVIEW_BARRIER_PATH, 'utf8');
const approvedBarrierDigest = crypto.createHash('sha256').update(barrierContent).digest('hex');

// Helper to construct a clean minimal compliant artifact fixture
function createCompliantFixture(tmpDir, customBuildInfo = {}) {
  const outputDir = path.join(tmpDir, 'output');
  const manifestPath = path.join(tmpDir, 'package-manifest.json');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'static/assets'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/public.func/api'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/newsroom.func/api'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/communications.func/api'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'functions/api/commerce.func/api'), { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'config.json'), '{"version":3}\n');
  fs.writeFileSync(path.join(outputDir, 'static/index.html'), '<!DOCTYPE html><html><head><title>HealthTimes</title></head><body><h1>HealthTimes</h1></body></html>\n');
  fs.writeFileSync(path.join(outputDir, 'static/manifest.json'), '{"name":"HealthTimes","short_name":"HealthTimes","start_url":"/"}\n');
  fs.writeFileSync(path.join(outputDir, 'static/sw.js'), '// sw.js\n');
  fs.writeFileSync(path.join(outputDir, 'static/healthtimes-icon.svg'), '<svg></svg>\n');
  fs.writeFileSync(path.join(outputDir, 'static/assets/app.js'), 'console.log("HealthTimes");\n');

  // Configure public reader function
  fs.writeFileSync(path.join(outputDir, 'functions/api/public.func/.vc-config.json'), JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'api/public.js',
    environment: {}
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(outputDir, 'functions/api/public.func/api/public.js'), 'module.exports = () => {};\n');

  // Configure mutating sealed functions
  const mutating = [
    { name: 'newsroom.func', file: 'api/newsroom.js' },
    { name: 'communications.func', file: 'api/communications.js' },
    { name: 'commerce.func', file: 'api/commerce.js' }
  ];

  for (const fn of mutating) {
    fs.writeFileSync(path.join(outputDir, 'functions/api', fn.name, '.vc-config.json'), JSON.stringify({
      runtime: 'nodejs22.x',
      handler: fn.file,
      environment: {
        HEALTHTIMES_PREVIEW_LOCK: '1',
        HEALTHTIMES_ARTIFACT_PROFILE: 'reader-only-preview'
      }
    }, null, 2) + '\n');
    fs.writeFileSync(path.join(outputDir, 'functions/api', fn.name, fn.file), barrierContent);
  }

  const buildInfo = {
    sha: 'fixture-test-sha-1234567890abcdef',
    serviceMode: 'source-parity',
    previewLocked: true,
    profile: 'reader-only-preview',
    ...customBuildInfo
  };
  fs.writeFileSync(path.join(outputDir, 'static/build-info.json'), JSON.stringify(buildInfo, null, 2) + '\n');

  generateManifest(outputDir, manifestPath);

  return { outputDir, manifestPath, expectedSha: buildInfo.sha, expectedBarrierDigest: approvedBarrierDigest };
}

test('G3 Manifest Verification Fail-Closed Tampering & Negative Controls', async (t) => {
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
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);
    const valid = verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    assert.equal(valid, true);
  });

  // 2. Tampering file content in artifact
  await t.test('2. Byte tampering in packaged file triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'byte-tamper');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const targetFile = path.join(outputDir, 'static/index.html');
    fs.appendFileSync(targetFile, '<!-- injected tampered byte -->\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /File byte hash mismatch/);
  });

  // 3. Tampering build-info.json commit SHA
  await t.test('3. Commit SHA mismatch in build-info.json triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'sha-mismatch');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfo.sha = '0000000000000000000000000000000000000000';
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /build-info\.json SHA mismatch/);
  });

  // 4. Malformed build-info.json
  await t.test('4. Malformed JSON in build-info.json triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'malformed-json');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    fs.writeFileSync(buildInfoPath, '{ corrupt_json::: invalid syntax');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /malformed JSON/);
  });

  // 5. Missing required baseline file
  await t.test('5. Missing required baseline file triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'missing-file');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const swPath = path.join(outputDir, 'static/sw.js');
    fs.unlinkSync(swPath);

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Required baseline file missing: static\/sw\.js/);
  });

  // 6. Extraneous untracked file in artifact
  await t.test('6. Extraneous untracked file triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'untracked-file');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const injectedPath = path.join(outputDir, 'static/backdoor-payload.js');
    fs.writeFileSync(injectedPath, 'console.log("backdoor");\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Untracked extraneous file detected: static\/backdoor-payload\.js/);
  });

  // 7. Tampered manifest aggregate digest
  await t.test('7. Tampered manifest aggregate digest triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'tampered-digest');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.aggregateDigest = '0000000000000000000000000000000000000000000000000000000000000000';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Aggregate digest mismatch/);
  });

  // 8. Service mode validation
  await t.test('8. Incorrect service mode triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'bad-service-mode');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfo.serviceMode = 'production';
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /build-info\.json serviceMode must be 'source-parity'/);
  });

  // 9. Missing or false previewLocked policy (DEF-G3-02)
  await t.test('9. Missing or false previewLocked triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'unlocked-preview');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfo.previewLocked = false;
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /build-info\.json previewLocked must be true/);
  });

  // 10. Missing or invalid artifact profile policy (DEF-G3-02)
  await t.test('10. Invalid artifact profile triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'bad-profile');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const buildInfoPath = path.join(outputDir, 'static/build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    buildInfo.profile = 'full-operational';
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /build-info\.json profile must be 'reader-only-preview'/);
  });

  // 11. Unsealed handler not matching approved preview barrier (DEF-G3-02)
  await t.test('11. Unsealed handler not matching preview barrier triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'unsealed-handler');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    // Tamper newsroom handler with active operational code
    const newsroomHandler = path.join(outputDir, 'functions/api/newsroom.func/api/newsroom.js');
    fs.writeFileSync(newsroomHandler, 'module.exports = async function(req, res) { return res.end("unsealed"); };');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /handler is NOT sealed with approved preview barrier/);
  });

  // 12. Unexpected function bundle in preview artifact (DEF-G3-02)
  await t.test('12. Unexpected function bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'unexpected-bundle');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const backdoorFunc = path.join(outputDir, 'functions/api/backdoor.func');
    fs.mkdirSync(backdoorFunc, { recursive: true });
    fs.writeFileSync(path.join(backdoorFunc, '.vc-config.json'), '{"runtime":"nodejs22.x"}\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected function bundle detected in preview artifact: functions\/api\/backdoor\.func/);
  });

  // 13. Retained extraneous executable script in sealed bundle (DEF-G3-02 / DEF-G3-04)
  await t.test('13. Retained extraneous script in sealed bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'extraneous-script');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const extraneousScript = path.join(outputDir, 'functions/api/newsroom.func/api/priv-bypass.js');
    fs.writeFileSync(extraneousScript, 'module.exports = () => {};\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle newsroom\.func/);
  });

  // 14. Injected .mjs module in sealed operational bundle (DEF-G3-04)
  await t.test('14. Injected .mjs module in sealed operational bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'injected-mjs');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const injectedMjs = path.join(outputDir, 'functions/api/newsroom.func/api/bypass.mjs');
    fs.writeFileSync(injectedMjs, 'export default function() {};\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle newsroom\.func: api\/bypass\.mjs/);
  });

  // 15. Injected .cjs module in sealed operational bundle (DEF-G3-04)
  await t.test('15. Injected .cjs module in sealed operational bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'injected-cjs');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const injectedCjs = path.join(outputDir, 'functions/api/commerce.func/api/legacy.cjs');
    fs.writeFileSync(injectedCjs, 'module.exports = {};\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle commerce\.func: api\/legacy\.cjs/);
  });

  // 16. Injected .node native binary in sealed operational bundle (DEF-G3-04)
  await t.test('16. Injected .node native binary in sealed operational bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'injected-node');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const injectedNode = path.join(outputDir, 'functions/api/communications.func/api/native.node');
    fs.writeFileSync(injectedNode, Buffer.from([0x7f, 0x45, 0x4c, 0x46])); // Mock ELF binary

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle communications\.func: api\/native\.node/);
  });

  // 17. Injected .wasm module in sealed operational bundle (DEF-G3-04)
  await t.test('17. Injected .wasm module in sealed operational bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'injected-wasm');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const injectedWasm = path.join(outputDir, 'functions/api/newsroom.func/api/payload.wasm');
    fs.writeFileSync(injectedWasm, Buffer.from([0x00, 0x61, 0x73, 0x6d])); // Mock WASM binary

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle newsroom\.func: api\/payload\.wasm/);
  });

  // 18. Injected alternative executable entrypoint (DEF-G3-04)
  await t.test('18. Alternative executable entrypoint (index.js) in sealed bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'alt-entrypoint-index');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const indexJs = path.join(outputDir, 'functions/api/newsroom.func/index.js');
    fs.writeFileSync(indexJs, 'module.exports = () => {};\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle newsroom\.func: index\.js/);
  });

  // 19. Injected alternative entrypoint with ESM extension (DEF-G3-04)
  await t.test('19. Alternative executable entrypoint (handler.mjs) in sealed bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'alt-entrypoint-handler');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const handlerMjs = path.join(outputDir, 'functions/api/commerce.func/handler.mjs');
    fs.writeFileSync(handlerMjs, 'export default () => {};\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unexpected executable content or alternative entrypoint retained in sealed bundle commerce\.func: handler\.mjs/);
  });

  // 20. Injected unapproved static file in sealed operational bundle (DEF-G3-04)
  await t.test('20. Unapproved static file in sealed operational bundle triggers fail-closed rejection', () => {
    const fixtureDir = path.join(testTmpDir, 'unapproved-static');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const unapprovedFile = path.join(outputDir, 'functions/api/communications.func/config.xml');
    fs.writeFileSync(unapprovedFile, '<config></config>\n');

    assert.throws(() => {
      verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    }, /Unapproved extraneous file retained in sealed bundle communications\.func: config\.xml/);
  });

  // 21. Read-only preservation proof
  await t.test('21. Read-only verification does not mutate manifest file', () => {
    const fixtureDir = path.join(testTmpDir, 'readonly-preservation');
    const { outputDir, manifestPath, expectedSha, expectedBarrierDigest } = createCompliantFixture(fixtureDir);

    const contentBefore = fs.readFileSync(manifestPath, 'utf8');
    verifyManifest({ outputDir, manifestPath, expectedSha, expectedBarrierDigest });
    const contentAfter = fs.readFileSync(manifestPath, 'utf8');

    assert.equal(contentBefore, contentAfter, 'Manifest content must remain byte-for-byte identical after verification');
  });

  // 22. Live workspace .vercel/output verification (if present)
  await t.test('22. Live workspace .vercel/output verification (if present)', () => {
    if (fs.existsSync(LIVE_OUTPUT_DIR) && fs.existsSync(LIVE_MANIFEST_PATH)) {
      const valid = verifyManifest({ outputDir: LIVE_OUTPUT_DIR, manifestPath: LIVE_MANIFEST_PATH });
      assert.equal(valid, true, 'Live packaged artifact must pass verification');
    }
  });

  // 23. Workflow G3 scope containment (Requirement A): Artifact job requires strict AND condition
  await t.test('23. Workflow G3 scope containment: CI workflow enforces strict AND condition (feat/ht-g3-* AND G2 ancestry, excluding G2 branches)', () => {
    const workflowPath = path.join(ROOT_DIR, '.github/workflows/ht-mvp-uiat01-r3-icr05b-certification.yml');
    assert.ok(fs.existsSync(workflowPath), 'Workflow file must exist');
    const content = fs.readFileSync(workflowPath, 'utf8');

    // Both deterministic-security-evidence and g3-isolated-artifact-certification must enforce strict AND
    const andMatches = content.match(/\[ "\$IS_G2_BRANCH" != "true" \] && \[\[ "\$CANDIDATE_REF" =~ \^feat\/ht-g3- \]\] && git merge-base --is-ancestor 46f3b0bd0d7b3da7c929b723e673f7bf73fd424c "\$CANDIDATE_SHA"/g);
    assert.ok(andMatches && andMatches.length >= 2, 'Workflow must enforce strict AND condition between G3 branch provenance and G2 ancestry in both check-scope and evidence jobs');

    // Negative check: ensure the defective OR pattern is nowhere in the workflow file
    assert.doesNotMatch(
      content,
      /\[\[ "\$CANDIDATE_REF" =~ \^feat\/ht-g3- \]\] \|\| git merge-base/,
      'Defective OR condition must not appear in workflow file'
    );
  });
});
