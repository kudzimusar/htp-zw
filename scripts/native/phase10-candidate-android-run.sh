#!/usr/bin/env bash
set -euo pipefail

APP_ID="zw.co.healthtimes.app.staging"
EXPECTED_SHA="${EXPECTED_SHA:-$(git rev-parse HEAD)}"
RUN_ATTEMPT="${RUN_ATTEMPT:-1}"
EVIDENCE_DIR="phase10-evidence/after/android"
DIAGNOSTICS_DIR="$EVIDENCE_DIR/diagnostics"
rm -rf "$EVIDENCE_DIR"  # Prevent stale evidence from previous attempts
mkdir -p "$DIAGNOSTICS_DIR"

echo "=== Phase 10 Candidate Android Execution Started ==="
echo "Candidate SHA: $EXPECTED_SHA"
echo "Run Attempt: $RUN_ATTEMPT"
echo "App ID: $APP_ID"

# 1. Record toolchain & system diagnostics
echo "=== SDK & Toolchain Diagnostics ===" > "$DIAGNOSTICS_DIR/toolchain.txt"
echo "Node: $(node -v 2>/dev/null || echo 'not found')" >> "$DIAGNOSTICS_DIR/toolchain.txt"
echo "Java: $(java -version 2>&1 | head -n 1 || echo 'not found')" >> "$DIAGNOSTICS_DIR/toolchain.txt"
echo "ADB: $(adb --version 2>&1 | head -n 1 || echo 'not found')" >> "$DIAGNOSTICS_DIR/toolchain.txt"
ls -la /dev/kvm > "$DIAGNOSTICS_DIR/kvm.txt" 2>&1 || echo "KVM not present at /dev/kvm" > "$DIAGNOSTICS_DIR/kvm.txt"

# 2. Wait for ADB and boot completion
echo "Waiting for Android emulator to register with ADB..."
if ! timeout 120s adb wait-for-device; then
  echo "ERROR: ADB device registration timed out" >&2
  adb devices -l > "$DIAGNOSTICS_DIR/adb-devices.txt" 2>&1 || true
  exit 1
fi

echo "Querying device properties..."
adb devices -l > "$DIAGNOSTICS_DIR/adb-devices.txt" 2>&1 || true
DEVICE_MODEL="$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo 'Unknown')"
API_LEVEL="$(adb shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || echo 'Unknown')"
OS_RELEASE="$(adb shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo 'Unknown')"
{
  echo "DEVICE_MODEL=$DEVICE_MODEL"
  echo "API_LEVEL=$API_LEVEL"
  echo "OS_RELEASE=$OS_RELEASE"
} > "$DIAGNOSTICS_DIR/device-info.txt"

echo "Ensuring boot completion..."
boot_ready=0
for i in $(seq 1 60); do
  if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    boot_ready=1
    break
  fi
  sleep 2
done
echo "sys.boot_completed=$boot_ready" > "$DIAGNOSTICS_DIR/boot-properties.txt"
if [[ "$boot_ready" != "1" ]]; then
  echo "ERROR: Android emulator failed to signal boot completion within timeout"
  adb logcat -d > "$DIAGNOSTICS_DIR/boot-failure-logcat.log" 2>&1 || true
  exit 1
fi

# 3. Configure display & unlock keyguard
adb shell cmd uimode night no || true
adb shell input keyevent 82 || true
# Settle Android OS & suppress system ANR popups on headless CI emulator
adb shell settings put global hide_error_dialogs 1 || true
adb shell settings put secure anr_show_background 0 || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS 2>/dev/null || true
sleep 5

# 4. Verify APK existence and install
APK_PATH="apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK_PATH" ]]; then
  echo "ERROR: Release APK not found at $APK_PATH" > "$DIAGNOSTICS_DIR/apk-install.log"
  exit 1
fi

APK_SIZE="$(wc -c < "$APK_PATH" | tr -d ' ')"
APK_SHA="$(sha256sum "$APK_PATH" | awk '{print $1}')"
{
  echo "APK_PATH=$APK_PATH"
  echo "APK_SIZE=$APK_SIZE"
  echo "APK_SHA256=$APK_SHA"
} > "$DIAGNOSTICS_DIR/apk-info.txt"

echo "Installing release APK ($APK_SIZE bytes)..."
adb install -r "$APK_PATH" > "$DIAGNOSTICS_DIR/apk-install.log" 2>&1 || {
  echo "ERROR: adb install failed"
  cat "$DIAGNOSTICS_DIR/apk-install.log"
  exit 1
}

adb shell pm path "$APP_ID" > "$DIAGNOSTICS_DIR/package-verify.txt" 2>&1 || {
  echo "ERROR: Package $APP_ID was not verified by package manager"
  exit 1
}
echo "Package $APP_ID verified on emulator."
# Settle after package registration and dismiss any lingering dialogs
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS 2>/dev/null || true
sleep 5

# 5. Execute visual evidence capture via Maestro flow
MAESTRO_OUTPUT="$EVIDENCE_DIR/maestro"
FLOW="apps/mobile/e2e/phase10-android-visual.yaml"
mkdir -p "$MAESTRO_OUTPUT"

echo "Running Maestro visual capture flow..."
set +e
maestro --device emulator-5554 test --test-output-dir "$MAESTRO_OUTPUT" "$FLOW" > "$DIAGNOSTICS_DIR/maestro.log" 2>&1
MAESTRO_EXIT=$?
set -e

echo "Maestro completed with exit code: $MAESTRO_EXIT"
cat "$DIAGNOSTICS_DIR/maestro.log"
if [[ "$MAESTRO_EXIT" -ne 0 ]]; then
  echo "ERROR: Maestro route assertions/capture failed; screenshots must not be used as substitute certification" >&2
  exit "$MAESTRO_EXIT"
fi

# Check if screenshots were produced by Maestro
for name in home premium watch; do
  src="$(find "$MAESTRO_OUTPUT" -type f -name "$name.png" -print -quit 2>/dev/null || true)"
  if [[ -n "$src" && -s "$src" ]]; then
    cp "$src" "$EVIDENCE_DIR/$name.png"
    echo "Located Maestro screenshot for $name: $src -> $EVIDENCE_DIR/$name.png"
  fi
done

# No fallback screenshots: only a successful Maestro flow establishes route readiness.
for name in home premium watch; do
  if [[ ! -s "$EVIDENCE_DIR/$name.png" ]]; then
    echo "ERROR: Missing Maestro screenshot $name.png after successful flow" >&2
    exit 1
  fi
done

# 6. Validate all required PNGs (magic bytes, size, dimensions)
python3 - <<'PY'
import os, struct, sys, pathlib, hashlib

root = pathlib.Path("phase10-evidence/after/android")
required = ["home.png", "premium.png", "watch.png"]
for name in required:
    p = root / name
    if not p.is_file():
        sys.exit(f"Missing required screenshot: {name}")
    raw = p.read_bytes()
    if len(raw) < 1000:
        sys.exit(f"Screenshot {name} is suspiciously small ({len(raw)} bytes)")
    if raw[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit(f"Screenshot {name} lacks valid PNG signature")
    if raw[12:16] != b"IHDR":
        sys.exit(f"Screenshot {name} missing IHDR chunk")
    w, h = struct.unpack(">II", raw[16:24])
    if w <= 0 or h <= 0:
        sys.exit(f"Screenshot {name} has invalid dimensions {w}x{h}")
    print(f"Validated {name}: {w}x{h}, {len(raw)} bytes, sha256={hashlib.sha256(raw).hexdigest()[:16]}...")
PY

# 7. Collect logcat & check for actionable runtime crashes
adb logcat -d > "$DIAGNOSTICS_DIR/logcat.log" 2>&1 || true
: > "$DIAGNOSTICS_DIR/runtime-errors.log"
grep -Ei \
  'FunctionCallException|KeyChainException|SecureStore.*(entitlement|not entitled|error|exception|failed)|ExpoSecureStore.*(entitlement|error|exception|failed)|\[com\.facebook\.react\.log:javascript\].*(ERROR|Error|Fatal|Exception)|Unhandled JS Exception|RCTFatal|Terminating app|FATAL EXCEPTION.*HealthTimes' \
  "$DIAGNOSTICS_DIR/logcat.log" >> "$DIAGNOSTICS_DIR/runtime-errors.log" || true

RUNTIME_ERROR_COUNT="$(awk 'NF{count++} END{print count+0}' "$DIAGNOSTICS_DIR/runtime-errors.log")"
echo "ACTIONABLE_RUNTIME_ERROR_COUNT=$RUNTIME_ERROR_COUNT"
if [[ "$RUNTIME_ERROR_COUNT" -gt 0 ]]; then
  echo "ERROR: Actionable runtime error strings found in logcat:" >&2
  cat "$DIAGNOSTICS_DIR/runtime-errors.log"
  exit 1
fi

# 8. Generate manifest.json and manifest.sha256
EXPECTED_SHA="$EXPECTED_SHA" \
RUN_ATTEMPT="$RUN_ATTEMPT" \
DEVICE_MODEL="$DEVICE_MODEL" \
API_LEVEL="$API_LEVEL" \
APP_ID="$APP_ID" \
RUNTIME_ERROR_COUNT="$RUNTIME_ERROR_COUNT" \
python3 - <<'PY'
import os, struct, json, pathlib, hashlib

root = pathlib.Path("phase10-evidence/after/android")
expected_sha = os.environ["EXPECTED_SHA"]
run_attempt = int(os.environ["RUN_ATTEMPT"])
device_model = os.environ.get("DEVICE_MODEL", "Pixel 7 Pro")
api_level = os.environ.get("API_LEVEL", "36")
app_id = os.environ["APP_ID"]
runtime_errors = int(os.environ.get("RUNTIME_ERROR_COUNT", "0"))

screens = []
for name, route in [("home", "/"), ("premium", "/premium"), ("watch", "/watch")]:
    p = root / f"{name}.png"
    raw = p.read_bytes()
    w, h = struct.unpack(">II", raw[16:24])
    screens.append({
        "name": name,
        "route": route,
        "file": p.name,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "dimensions": [w, h],
        "sizeBytes": len(raw),
        "captureMethod": "MAESTRO_FLOW",
        "automatedRouteAssertionsPassed": True,
        "independentVisualInspection": "PENDING"
    })

manifest = {
    "phase": "UI-WF-EV01 / Phase-10 Android visual evidence",
    "candidateSha": expected_sha,
    "runAttempt": run_attempt,
    "device": device_model,
    "apiLevel": api_level,
    "package": app_id,
    "method": "reactivecircus/android-emulator-runner@v2 + Maestro",
    "actionableNativeRuntimeErrorCount": runtime_errors,
    "diagnosticsCollected": True,
    "diagnosticsArtifactUpload": "PENDING_GITHUB_ACTIONS_UPLOAD",
    "maestroExitCode": 0,
    "independentVisualReviewStatus": "PENDING_NON_AUTHOR_REVIEW",
    "androidVisualCertification": "PASS" if runtime_errors == 0 else "FAIL",
    "screens": screens
}

manifest_bytes = json.dumps(manifest, indent=2).encode("utf-8")
(root / "manifest.json").write_bytes(manifest_bytes)
manifest_sha = hashlib.sha256(manifest_bytes).hexdigest()
(root / "manifest.sha256").write_text(f"{manifest_sha}  manifest.json\n")
print(f"Generated manifest.json (SHA-256: {manifest_sha})")
PY

cat "$EVIDENCE_DIR/manifest.json"
echo "=== Phase 10 Candidate Android Evidence Capture Successfully Completed ==="
