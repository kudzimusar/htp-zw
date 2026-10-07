#!/usr/bin/env bash
set -euo pipefail

DEVICE_CLASS="${1:?device class required}"
DEVICE_PROFILE="${2:?device profile required}"
FLOW="${3:?Maestro flow required}"
CANDIDATE_SHA="${4:?candidate SHA required}"
EVIDENCE_DIR="ui-wf01a-native-evidence/android-${DEVICE_CLASS}"

mkdir -p "$EVIDENCE_DIR"
adb wait-for-device
adb shell cmd uimode night no || true
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk

maestro --device emulator-5554 test --test-output-dir "$EVIDENCE_DIR" "$FLOW"

adb logcat -d '*:E' 2>/dev/null \
  | grep -Ei 'ReactNativeJS|AndroidRuntime|FATAL EXCEPTION' \
  > "$EVIDENCE_DIR/native-errors.log" || true

DEVICE_NAME="$(adb shell getprop ro.product.model | tr -d '\r')"
OS_VERSION="$(adb shell getprop ro.build.version.release | tr -d '\r')"

EVIDENCE_DIR="$EVIDENCE_DIR" CANDIDATE_SHA="$CANDIDATE_SHA" RUN_ATTEMPT="${RUN_ATTEMPT:-0}" \
NATIVE_PLATFORM="Android" DEVICE_CLASS="$DEVICE_CLASS" DEVICE_IDENTITY="$DEVICE_NAME ($DEVICE_PROFILE)" \
OS_VERSION="$OS_VERSION" node - <<'NODE'
const fs=require("fs"), path=require("path");
const root=process.env.EVIDENCE_DIR;
const screenshots=[];
function walk(dir){
  if(!fs.existsSync(dir)) return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(/\.png$/i.test(entry.name)) screenshots.push(path.relative(root,full));
  }
}
walk(root);
const manifest={
  task:"UI-WF-01A",
  candidateSha:process.env.CANDIDATE_SHA,
  runAttempt:process.env.RUN_ATTEMPT,
  platform:process.env.NATIVE_PLATFORM,
  deviceClass:process.env.DEVICE_CLASS,
  deviceIdentity:process.env.DEVICE_IDENTITY,
  osVersion:process.env.OS_VERSION,
  orientation:"portrait",
  screenshots:screenshots.sort()
};
fs.writeFileSync(path.join(root,"identity.json"),JSON.stringify(manifest,null,2));
NODE
