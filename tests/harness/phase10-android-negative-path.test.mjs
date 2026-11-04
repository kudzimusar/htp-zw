import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve('.');
const runnerScript = resolve('scripts/native/phase10-candidate-android-run.sh');

function createValidPngBuffer(width = 1440, height = 3120) {
  const buf = Buffer.alloc(1200);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf.writeUInt8(8, 24);
  buf.writeUInt8(6, 25);
  buf.writeUInt8(0, 26);
  buf.writeUInt8(0, 27);
  buf.writeUInt8(0, 28);
  return buf;
}

function setupMockSandbox() {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'phase10-android-neg-'));
  const mockBinDir = join(sandboxDir, 'mock-bin');
  mkdirSync(mockBinDir, { recursive: true });

  // Mock timeout (fallback if system timeout not found or different flag support)
  const mockTimeout = join(mockBinDir, 'timeout');
  writeFileSync(mockTimeout, `#!/usr/bin/env bash
if [[ "$1" =~ ^[0-9]+s?$ ]]; then
  shift
fi
exec "$@"
`);
  chmodSync(mockTimeout, 0o755);

  // Mock sleep to keep test execution instant
  const mockSleep = join(mockBinDir, 'sleep');
  writeFileSync(mockSleep, `#!/usr/bin/env bash
exit 0
`);
  chmodSync(mockSleep, 0o755);

  // Mock sha256sum using shasum
  const mockSha256 = join(mockBinDir, 'sha256sum');
  writeFileSync(mockSha256, `#!/usr/bin/env bash
exec shasum -a 256 "$@"
`);
  chmodSync(mockSha256, 0o755);

  // Mock adb
  const mockAdb = join(mockBinDir, 'adb');
  writeFileSync(mockAdb, `#!/usr/bin/env bash
cmd="$1"
shift || true

case "$cmd" in
  --version)
    echo "Android Debug Bridge version 1.0.41"
    exit 0
    ;;
  wait-for-device)
    if [[ "\${MOCK_ADB_MODE:-}" == "wait_timeout" ]]; then
      echo "timeout waiting for device" >&2
      exit 1
    fi
    exit 0
    ;;
  devices)
    echo "List of devices attached"
    echo "emulator-5554 device product:pixel_7_pro model:Pixel_7_Pro device:pixel_7_pro transport_id:1"
    exit 0
    ;;
  shell)
    sub="$1"
    shift || true
    case "$sub" in
      getprop)
        prop="$1"
        case "$prop" in
          ro.product.model) echo "Pixel 7 Pro" ;;
          ro.build.version.sdk) echo "36" ;;
          ro.build.version.release) echo "16" ;;
          sys.boot_completed)
            if [[ "\${MOCK_ADB_MODE:-}" == "boot_timeout" ]]; then
              echo "0"
            else
              echo "1"
            fi
            ;;
          *) echo "" ;;
        esac
        exit 0
        ;;
      cmd)
        exit 0
        ;;
      input)
        exit 0
        ;;
      pm)
        if [[ "\${MOCK_ADB_MODE:-}" == "pm_path_fail" ]]; then
          echo "Package not found" >&2
          exit 1
        fi
        echo "package:/data/app/zw.co.healthtimes.app.staging/base.apk"
        exit 0
        ;;
      *)
        exit 0
        ;;
    esac
    ;;
  install)
    if [[ "\${MOCK_ADB_MODE:-}" == "install_fail" ]]; then
      echo "INSTALL_FAILED_ALREADY_EXISTS" >&2
      exit 1
    fi
    echo "Success"
    exit 0
    ;;
  logcat)
    if [[ "\${MOCK_ADB_MODE:-}" == "runtime_error" ]]; then
      echo "01-01 12:00:00.000  1000  1000 E AndroidRuntime: FATAL EXCEPTION: main"
      echo "01-01 12:00:00.001  1000  1000 E AndroidRuntime: Process: zw.co.healthtimes.app.staging"
      echo "01-01 12:00:00.002  1000  1000 E AndroidRuntime: Unhandled JS Exception"
    else
      echo "01-01 12:00:00.000  1000  1000 I ReactNative: [Navigation] Ready"
      echo "01-01 12:00:00.000  1000  1000 I ReactNative: [Reader] Rendered Top Stories cleanly"
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`);
  chmodSync(mockAdb, 0o755);

  // Helper script to write valid dummy PNG
  const pngGenScript = join(mockBinDir, 'gen-png.cjs');
  writeFileSync(pngGenScript, `
const fs = require('fs');
const target = process.argv[2];
const width = parseInt(process.argv[3] || '1440', 10);
const height = parseInt(process.argv[4] || '3120', 10);
const buf = Buffer.alloc(1200);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
buf.writeUInt32BE(13, 8);
buf.write('IHDR', 12, 'ascii');
buf.writeUInt32BE(width, 16);
buf.writeUInt32BE(height, 20);
buf.writeUInt8(8, 24);
buf.writeUInt8(6, 25);
buf.writeUInt8(0, 26);
buf.writeUInt8(0, 27);
buf.writeUInt8(0, 28);
fs.writeFileSync(target, buf);
`);

  // Mock maestro
  const mockMaestro = join(mockBinDir, 'maestro');
  writeFileSync(mockMaestro, `#!/usr/bin/env bash
out_dir=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --test-output-dir)
      out_dir="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ "\${MOCK_MAESTRO_MODE:-}" == "fail" ]]; then
  echo "Maestro flow failed: assertion timed out on element" >&2
  exit 42
fi

if [[ -n "$out_dir" ]]; then
  mkdir -p "$out_dir"
  if [[ "\${MOCK_MAESTRO_MODE:-}" != "missing_watch" ]]; then
    node "${pngGenScript}" "$out_dir/watch.png" 1440 3120
  fi
  node "${pngGenScript}" "$out_dir/home.png" 1440 3120
  node "${pngGenScript}" "$out_dir/premium.png" 1440 3120
fi

echo "Maestro test execution finished successfully"
exit 0
`);
  chmodSync(mockMaestro, 0o755);

  // Setup sandbox mock repo tree
  const apkDir = join(sandboxDir, 'apps/mobile/android/app/build/outputs/apk/release');
  mkdirSync(apkDir, { recursive: true });
  writeFileSync(join(apkDir, 'app-release.apk'), 'DUMMY_RELEASE_APK_CONTENT_FOR_TESTING');

  const e2eDir = join(sandboxDir, 'apps/mobile/e2e');
  mkdirSync(e2eDir, { recursive: true });
  writeFileSync(join(e2eDir, 'phase10-android-visual.yaml'), 'appId: zw.co.healthtimes.app.staging\n---\n- launchApp\n');

  return { sandboxDir, mockBinDir };
}

function runCandidateScript(sandboxDir, mockBinDir, extraEnv = {}) {
  const currentPath = process.env.PATH || '';
  const newPath = `${mockBinDir}:${currentPath}`;
  return spawnSync('bash', [runnerScript], {
    cwd: sandboxDir,
    env: {
      ...process.env,
      PATH: newPath,
      EXPECTED_SHA: 'ad609844e249ea250c86a744a1cd9ba939111ddf',
      RUN_ATTEMPT: '1',
      ...extraEnv
    },
    encoding: 'utf8'
  });
}

test('Controlled Negative Path 1: Nonzero Maestro exit fails closed immediately with error code', () => {
  const { sandboxDir, mockBinDir } = setupMockSandbox();
  try {
    const res = runCandidateScript(sandboxDir, mockBinDir, { MOCK_MAESTRO_MODE: 'fail' });
    assert.notEqual(res.status, 0, 'Script must exit nonzero when Maestro fails');
    assert.equal(res.status, 42, 'Script must exit with Maestro exit code');
    const combinedOutput = `${res.stdout}\n${res.stderr}`;
    assert.match(
      combinedOutput,
      /ERROR: Maestro route assertions\/capture failed; screenshots must not be used as substitute certification/
    );
    assert.equal(
      existsSync(join(sandboxDir, 'phase10-evidence/after/android/manifest.json')),
      false,
      'manifest.json must NEVER be generated when Maestro fails'
    );
    assert.equal(
      existsSync(join(sandboxDir, 'phase10-evidence/after/android/home.png')),
      false,
      'Evidence screenshots must NOT be copied when Maestro fails'
    );
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});

test('Controlled Negative Path 2: Missing Maestro screenshot fails closed and is NOT replaced by fallback', () => {
  const { sandboxDir, mockBinDir } = setupMockSandbox();
  try {
    const res = runCandidateScript(sandboxDir, mockBinDir, { MOCK_MAESTRO_MODE: 'missing_watch' });
    assert.notEqual(res.status, 0, 'Script must exit nonzero when required screenshot is missing');
    assert.equal(res.status, 1);
    const combinedOutput = `${res.stdout}\n${res.stderr}`;
    assert.match(combinedOutput, /ERROR: Missing Maestro screenshot watch\.png after successful flow/);
    assert.doesNotMatch(combinedOutput, /Fallback capture succeeded/, 'Fallback capture must not execute');
    assert.equal(
      existsSync(join(sandboxDir, 'phase10-evidence/after/android/manifest.json')),
      false,
      'manifest.json must NEVER be generated when screenshot is missing'
    );
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});

test('Controlled Negative Path 3: ADB device registration timeout fails closed', () => {
  const { sandboxDir, mockBinDir } = setupMockSandbox();
  try {
    const res = runCandidateScript(sandboxDir, mockBinDir, { MOCK_ADB_MODE: 'wait_timeout' });
    assert.notEqual(res.status, 0, 'Script must exit nonzero when ADB device registration times out');
    const combinedOutput = `${res.stdout}\n${res.stderr}`;
    assert.match(combinedOutput, /ERROR: ADB device registration timed out/);
    assert.equal(
      existsSync(join(sandboxDir, 'phase10-evidence/after/android/manifest.json')),
      false
    );
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});

test('Controlled Negative Path 4: Package manager identity verification failure fails closed', () => {
  const { sandboxDir, mockBinDir } = setupMockSandbox();
  try {
    const res = runCandidateScript(sandboxDir, mockBinDir, { MOCK_ADB_MODE: 'pm_path_fail' });
    assert.notEqual(res.status, 0, 'Script must exit nonzero when package path query fails');
    const combinedOutput = `${res.stdout}\n${res.stderr}`;
    assert.match(combinedOutput, /ERROR: Package zw\.co\.healthtimes\.app\.staging was not verified by package manager/);
    assert.equal(
      existsSync(join(sandboxDir, 'phase10-evidence/after/android/manifest.json')),
      false
    );
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});

test('Controlled Negative Path 5: Actionable runtime error strings in logcat fail the certification gate', () => {
  const { sandboxDir, mockBinDir } = setupMockSandbox();
  try {
    const res = runCandidateScript(sandboxDir, mockBinDir, { MOCK_ADB_MODE: 'runtime_error' });
    assert.notEqual(res.status, 0, 'Script must exit nonzero when actionable runtime crashes occur in logcat');
    const combinedOutput = `${res.stdout}\n${res.stderr}`;
    assert.match(combinedOutput, /ERROR: Actionable runtime error strings found in logcat:/);
    assert.match(combinedOutput, /Unhandled JS Exception/);
    assert.equal(
      existsSync(join(sandboxDir, 'phase10-evidence/after/android/manifest.json')),
      false,
      'manifest.json must NEVER be generated when actionable runtime errors are detected'
    );
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});

test('Controlled Positive Path: Successful execution produces honest manifest without false visual guarantees', () => {
  const { sandboxDir, mockBinDir } = setupMockSandbox();
  try {
    const res = runCandidateScript(sandboxDir, mockBinDir);
    assert.equal(res.status, 0, `Script must exit 0 on clean run. Output: ${res.stdout}\n${res.stderr}`);
    const manifestPath = join(sandboxDir, 'phase10-evidence/after/android/manifest.json');
    assert.ok(existsSync(manifestPath), 'manifest.json must exist');

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.maestroExitCode, 0);
    assert.equal(manifest.actionableNativeRuntimeErrorCount, 0);
    assert.equal(manifest.androidVisualCertification, 'PASS');
    assert.equal(manifest.independentVisualReviewStatus, 'PENDING_NON_AUTHOR_REVIEW');

    // Verify each screen
    assert.equal(manifest.screens.length, 3);
    for (const screen of manifest.screens) {
      assert.equal(screen.captureMethod, 'MAESTRO_FLOW');
      assert.equal(screen.automatedRouteAssertionsPassed, true);
      assert.equal(screen.independentVisualInspection, 'PENDING');
      assert.equal(screen.resolved, undefined, 'Must not assert subjective resolved condition');
      assert.equal(screen.systemDialogRemaining, undefined, 'Must not assert subjective systemDialogRemaining');
      assert.equal(screen.loadingOrErrorSurfaceRemaining, undefined, 'Must not assert subjective loading condition');
    }
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
});
