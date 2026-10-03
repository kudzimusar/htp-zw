#!/usr/bin/env bash
set -euo pipefail

DEVICE_CLASS="${1:?device class required}"
DEVICE_PROFILE="${2:?device profile required}"
FLOW="${3:?Maestro flow required}"
CANDIDATE_SHA="${4:?candidate SHA required}"
EVIDENCE_DIR="ui02-phase6a-native-evidence/android-${DEVICE_CLASS}"

mkdir -p "$EVIDENCE_DIR"
adb wait-for-device
adb shell cmd uimode night no || true
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk

# The release evidence binary is self-contained: its JS bundle is embedded at
# Gradle build time. Do not make native certification depend on a host Metro
# process or a resized/browser substitute.
maestro --device emulator-5554 test --test-output-dir "$EVIDENCE_DIR" "$FLOW"

adb logcat -d '*:E' 2>/dev/null \
  | grep -Ei 'healthtimes|ReactNativeJS|AndroidRuntime' \
  > "$EVIDENCE_DIR/native-errors.log" || true

DEVICE_NAME="$(adb shell getprop ro.product.model | tr -d '\r')"
OS_VERSION="$(adb shell getprop ro.build.version.release | tr -d '\r')"

EVIDENCE_DIR="$EVIDENCE_DIR" CANDIDATE_SHA="$CANDIDATE_SHA" NATIVE_PLATFORM="Android" DEVICE_CLASS="$DEVICE_CLASS" DEVICE_IDENTITY="$DEVICE_NAME ($DEVICE_PROFILE)" OS_VERSION="$OS_VERSION" ORIENTATION="portrait" node scripts/native/ui02-phase6a-manifest.mjs
