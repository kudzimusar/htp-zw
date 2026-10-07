#!/usr/bin/env bash
set -euo pipefail

DEVICE_CLASS="${1:?device class required}"
DEVICE_PROFILE="${2:?device profile required}"
FLOW="${3:?Maestro flow required}"
CANDIDATE_SHA="${4:?candidate SHA required}"
APP_ID="zw.co.healthtimes.app.dev"
SYSTEM_UI_DIALOG="System UI isn't responding"
EVIDENCE_DIR="ui02-phase6a-native-evidence/android-$DEVICE_CLASS"
FIRST_JOURNEY_DIR="$EVIDENCE_DIR/maestro-journey-1"
SECOND_JOURNEY_DIR="$EVIDENCE_DIR/maestro-journey-2"
RECOVERY_DIR="$EVIDENCE_DIR/infrastructure-recovery"
RECOVERY_USED=0

mkdir -p "$EVIDENCE_DIR"
adb wait-for-device
adb shell cmd uimode night no || true
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk

# The release evidence binary is self-contained: its JS bundle is embedded at
# Gradle build time. Do not make native certification depend on a host Metro
# process or a resized/browser substitute.
run_maestro_journey(){
  local output_dir="$1"
  mkdir -p "$output_dir"
  maestro --device emulator-5554 test --test-output-dir "$output_dir" "$FLOW"
}

# Return hierarchy path, failed screenshot path and Wait-button tap coordinates
# only when the exact recoverable Android System UI ANR evidence is present.
find_system_ui_recovery_evidence(){
  local journey_dir="$1"
  python3 - "$journey_dir" "$APP_ID" <<'PY'
import json, re, sys
from pathlib import Path

root=Path(sys.argv[1])
app_id=sys.argv[2]

def walk(node):
    if isinstance(node,dict):
        yield node
        for child in node.get("children",[]) or []:
            yield from walk(child)
    elif isinstance(node,list):
        for child in node:
            yield from walk(child)

for hierarchy in sorted(root.rglob("screen-hierarchy/*.json"),key=lambda p:p.stat().st_mtime,reverse=True):
    try:
        data=json.loads(hierarchy.read_text(encoding="utf-8"))
    except Exception:
        continue
    attrs=[node.get("attributes",{}) for node in walk(data)]
    texts=[str(a.get("text","") or "") for a in attrs]
    exact_dialog=sum(t=="System UI isn't responding" for t in texts)==1
    wait_nodes=[a for a in attrs if a.get("resource-id")=="android:id/aerr_wait" and a.get("text")=="Wait"]
    system_ui_foreground=any(str(a.get("resource-id","")).startswith("com.android.systemui:id/") for a in attrs)
    healthtimes_anr=any("isn't responding" in t and ("HealthTimes" in t or app_id in t) for t in texts)
    if not (exact_dialog and wait_nodes and system_ui_foreground) or healthtimes_anr:
        continue
    screenshot_candidates=list(root.rglob("screenshots/"+hierarchy.stem+".png"))
    if not screenshot_candidates:
        continue
    screenshot=screenshot_candidates[0]
    raw=screenshot.read_bytes()
    if len(raw)<24 or raw[:8]!=bytes([137,80,78,71,13,10,26,10]):
        continue
    bounds=str(wait_nodes[0].get("bounds", ""))
    match=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",bounds)
    if not match:
        continue
    x1,y1,x2,y2=map(int,match.groups())
    print(hierarchy)
    print(screenshot)
    print((x1+x2)//2)
    print((y1+y2)//2)
    raise SystemExit(0)
raise SystemExit(2)
PY
}

# Any HealthTimes ANR, React Native runtime failure, or app-attributable fatal
# exception is a hard certification failure and is never eligible for recovery.
assert_no_healthtimes_runtime_failure(){
  local log_file="$1"
  python3 - "$log_file" "$APP_ID" <<'PY'
import re, sys
from pathlib import Path

lines=Path(sys.argv[1]).read_text(encoding="utf-8",errors="replace").splitlines()
app_id=sys.argv[2]
text="\n".join(lines)
if f"ANR in {app_id}" in text:
    raise SystemExit("HealthTimes application ANR is not recoverable")
if any("isn't responding" in line and ("HealthTimes" in line or app_id in line) for line in lines):
    raise SystemExit("HealthTimes application ANR dialog is not recoverable")
for index,line in enumerate(lines):
    if "ReactNativeJS" in line and re.search(r"(?:FATAL|ERROR|Error|Exception|Unhandled)",line):
        raise SystemExit("React Native runtime error is not recoverable: "+line)
    if "FATAL EXCEPTION" in line or "AndroidRuntime" in line:
        chunk="\n".join(lines[max(0,index-8):min(len(lines),index+48)])
        if app_id in chunk:
            raise SystemExit("HealthTimes FATAL EXCEPTION / AndroidRuntime failure is not recoverable")
PY
}

set +e
run_maestro_journey "$FIRST_JOURNEY_DIR"
FIRST_STATUS=$?
set -e

if [[ "$FIRST_STATUS" -ne 0 ]]; then
  RECOVERY_INFO_FILE="$EVIDENCE_DIR/recovery-info.txt"
  if ! find_system_ui_recovery_evidence "$FIRST_JOURNEY_DIR" > "$RECOVERY_INFO_FILE"; then
    echo "Android Maestro journey failed without the exact recoverable System UI ANR evidence; no recovery permitted"
    exit "$FIRST_STATUS"
  fi
  if [[ "$(wc -l < "$RECOVERY_INFO_FILE" | tr -d ' ')" -ne 4 ]]; then
    echo "Recoverable System UI evidence receipt was incomplete; no recovery permitted"
    exit "$FIRST_STATUS"
  fi

  FIRST_HIERARCHY="$(sed -n '1p' "$RECOVERY_INFO_FILE")"
  FIRST_SCREENSHOT="$(sed -n '2p' "$RECOVERY_INFO_FILE")"
  WAIT_X="$(sed -n '3p' "$RECOVERY_INFO_FILE")"
  WAIT_Y="$(sed -n '4p' "$RECOVERY_INFO_FILE")"
  FIRST_SCREEN_REL="$(python3 - "$FIRST_JOURNEY_DIR" "$FIRST_SCREENSHOT" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[2]).relative_to(Path(sys.argv[1])))
PY
)"

  mkdir -p "$RECOVERY_DIR"
  adb logcat -d > "$RECOVERY_DIR/device-logcat-before-recovery.txt"
  adb shell dumpsys window windows > "$RECOVERY_DIR/window-before-recovery.txt" 2>&1 || true
  adb shell dumpsys activity activities > "$RECOVERY_DIR/activity-before-recovery.txt" 2>&1 || true
  adb shell dumpsys activity lastanr > "$RECOVERY_DIR/lastanr-before-recovery.txt" 2>&1 || true
  adb shell dumpsys SurfaceFlinger --list > "$RECOVERY_DIR/surfaceflinger-before-recovery.txt" 2>&1 || true
  adb exec-out screencap -p > "$RECOVERY_DIR/system-ui-anr-live.png" 2>/dev/null || true

  assert_no_healthtimes_runtime_failure "$RECOVERY_DIR/device-logcat-before-recovery.txt"
  if grep -Fq "$APP_ID" "$RECOVERY_DIR/lastanr-before-recovery.txt"; then
    echo "HealthTimes appears in Android last-ANR attribution; recovery forbidden"
    exit "$FIRST_STATUS"
  fi
  if ! adb shell pidof "$APP_ID" > "$RECOVERY_DIR/healthtimes-pid.txt" 2>/dev/null || [[ ! -s "$RECOVERY_DIR/healthtimes-pid.txt" ]]; then
    echo "HealthTimes process was not alive under the System UI dialog; recovery forbidden"
    exit "$FIRST_STATUS"
  fi
  if ! grep -Fq "$APP_ID" "$RECOVERY_DIR/activity-before-recovery.txt"; then
    echo "HealthTimes activity was not present under the System UI dialog; recovery forbidden"
    exit "$FIRST_STATUS"
  fi
  if ! grep -Fq "$APP_ID" "$RECOVERY_DIR/surfaceflinger-before-recovery.txt"; then
    echo "HealthTimes rendered surface was not present beneath the System UI dialog; recovery forbidden"
    exit "$FIRST_STATUS"
  fi

  # Preserve the exact failed hierarchy/screenshot for direct moderator inspection,
  # then archive the complete interrupted journey so partial screenshots cannot be
  # mistaken for second-journey certification evidence by the recursive manifest.
  cp "$FIRST_HIERARCHY" "$RECOVERY_DIR/system-ui-anr-hierarchy.json"
  cp "$FIRST_SCREENSHOT" "$RECOVERY_DIR/system-ui-anr-failed-maestro.png"
  tar -czf "$RECOVERY_DIR/first-journey.tar.gz" -C "$FIRST_JOURNEY_DIR" .
  rm -rf "$FIRST_JOURNEY_DIR"

  cat > "$RECOVERY_DIR/infrastructure-recovery.yaml" <<'YAML'
infrastructureRecovery:
  type: android-system-ui-anr
  dialog: "System UI isn't responding"
  recoveryAction: "Wait"
  recoveryCount: 1
  firstJourneyResult: INTERRUPTED_BY_OS
  secondJourneyResult: PASS
YAML

  cat > "$RECOVERY_DIR/recovery-proof.json" <<JSON
{
  "type": "android-system-ui-anr",
  "dialog": "System UI isn't responding",
  "waitControl": "android:id/aerr_wait",
  "foregroundOwner": "com.android.systemui",
  "foregroundOwnershipEvidence": "infrastructure-recovery/system-ui-anr-hierarchy.json",
  "lastAnrDiagnostic": "infrastructure-recovery/lastanr-before-recovery.txt",
  "healthTimesProcessAlive": true,
  "underlyingScreenshot": "infrastructure-recovery/system-ui-anr-failed-maestro.png",
  "underlyingRenderedSurfaceEvidence": "infrastructure-recovery/surfaceflinger-before-recovery.txt",
  "underlyingActivityEvidence": "infrastructure-recovery/activity-before-recovery.txt",
  "firstJourneyArchive": "infrastructure-recovery/first-journey.tar.gz",
  "healthTimesRuntimeFailureDetected": false,
  "recoveryAction": "Wait",
  "recoveryCount": 1,
  "firstJourneyResult": "INTERRUPTED_BY_OS"
}
JSON

  # Dismiss the exact Android OS Wait control, allow System UI to settle, then
  # clear first-attempt logcat so final runtime-error accounting covers only the
  # single complete recovery journey.
  adb shell input tap "$WAIT_X" "$WAIT_Y"
  SETTLED=0
  for _ in $(seq 1 30); do
    adb shell uiautomator dump /sdcard/ui02-system-ui.xml >/dev/null 2>&1 || true
    CURRENT_HIERARCHY="$(adb exec-out cat /sdcard/ui02-system-ui.xml 2>/dev/null || true)"
    if [[ -n "$CURRENT_HIERARCHY" ]] && ! grep -Fq "$SYSTEM_UI_DIALOG" <<< "$CURRENT_HIERARCHY"; then
      SETTLED=1
      break
    fi
    sleep 2
  done
  if [[ "$SETTLED" -ne 1 ]]; then
    echo "System UI dialog did not settle after the single Wait recovery"
    exit 1
  fi
  sleep 5
  adb logcat -c || true

  # The Maestro flow itself begins with launchApp clearState, so this is one
  # complete second journey inside the same GitHub job/run attempt.
  set +e
  run_maestro_journey "$SECOND_JOURNEY_DIR"
  SECOND_STATUS=$?
  set -e
  if [[ "$SECOND_STATUS" -ne 0 ]]; then
    adb logcat -d > "$RECOVERY_DIR/device-logcat-after-second-failure.txt" 2>/dev/null || true
    echo "Second Android Maestro journey failed after the single System UI recovery; no further recovery permitted"
    exit "$SECOND_STATUS"
  fi
  RECOVERY_USED=1
fi

adb logcat -d '*:E' 2>/dev/null \
  | grep -Ei 'ReactNativeJS|AndroidRuntime|FATAL EXCEPTION' \
  > "$EVIDENCE_DIR/native-errors.log" || true

DEVICE_NAME="$(adb shell getprop ro.product.model | tr -d '\r')"
OS_VERSION="$(adb shell getprop ro.build.version.release | tr -d '\r')"

EVIDENCE_DIR="$EVIDENCE_DIR" CANDIDATE_SHA="$CANDIDATE_SHA" RUN_ATTEMPT="$RUN_ATTEMPT" NATIVE_PLATFORM="Android" DEVICE_CLASS="$DEVICE_CLASS" DEVICE_IDENTITY="$DEVICE_NAME ($DEVICE_PROFILE)" OS_VERSION="$OS_VERSION" ORIENTATION="portrait" node scripts/native/ui02-phase6a-manifest.mjs

if [[ "$RECOVERY_USED" -eq 1 ]]; then
  EVIDENCE_DIR="$EVIDENCE_DIR" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const path=join(process.env.EVIDENCE_DIR,"manifest.json");
const manifest=JSON.parse(readFileSync(path,"utf8"));
if(manifest.nativeRuntimeErrorLineCount!==0){
  throw new Error("Recovered Android certification must retain nativeRuntimeErrorLineCount = 0 for HealthTimes");
}
manifest.infrastructureRecovery={
  type:"android-system-ui-anr",
  dialog:"System UI isn't responding",
  recoveryAction:"Wait",
  recoveryCount:1,
  firstJourneyResult:"INTERRUPTED_BY_OS",
  secondJourneyResult:"PASS"
};
writeFileSync(path,JSON.stringify(manifest,null,2));
NODE
fi
