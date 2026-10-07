import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const readRepo=(path)=>readFileSync(join(repoRoot,path),"utf8");

test("Phase 6A remains one canonical shared Reader",()=>{
  const pkg=JSON.parse(read("package.json"));
  const rootLayout=read("app/_layout.tsx");
  assert.equal(pkg.name,"@healthtimes/mobile");
  assert.ok(rootLayout.includes('<Stack.Screen name="(reader)"'));
  assert.equal(rootLayout.includes("WebView"),false);
});

test("native app identity supports iOS Android tablets deep links and automatic appearance",()=>{
  const config=read("app.config.ts");
  assert.ok(config.includes('scheme: "healthtimes"'));
  assert.ok(config.includes("supportsTablet: true"));
  assert.ok(config.includes('orientation: "default"'));
  assert.ok(config.includes('userInterfaceStyle: "automatic"'));
  assert.ok(config.includes('"zw.co.healthtimes.app" + suffix'));
});

test("shared page shell protects native top side safe areas and bottom reader controls",()=>{
  const layout=read("src/ui/Layout.tsx");
  const tabs=read("app/(reader)/_layout.tsx");
  assert.ok(layout.includes('edges={["top", "left", "right"]}'));
  assert.ok(layout.includes("bottomInset={mobileTabsVisible ? 96 : 64}"));
  assert.ok(tabs.includes("minHeight:66"));
  assert.ok(tabs.includes("tabBarItemStyle:{minHeight:56}"));
});

test("native search exposes keyboard-safe focus and submission semantics",()=>{
  const layout=read("src/ui/Layout.tsx");
  const search=read("app/search.tsx");
  assert.ok(layout.includes('keyboardShouldPersistTaps="handled"'));
  assert.ok(search.includes('accessibilityLabel="Search HealthTimes"'));
  assert.ok(search.includes('returnKeyType="search"'));
  assert.ok(search.includes("onSubmitEditing={()=>submit()}"));
});

test("article native interactions keep accessible touch targets and persistence authority",()=>{
  const toolbar=read("src/ui/ArticleToolbar.tsx");
  const article=read("app/article/[id].tsx");
  const persistence=read("src/services/reader-persistence.ts");
  assert.ok(toolbar.includes("minHeight: layout.touchMin"));
  assert.ok(toolbar.includes('label="Save article"'));
  assert.ok(toolbar.includes('label="Share article"'));
  assert.ok(toolbar.includes('accessibilityLabel="Download article for offline reading"'));
  assert.ok(article.includes("Share.share"));
  assert.ok(article.includes("services.reader.toggleSavedArticle"));
  assert.ok(article.includes("services.reader.downloadArticle"));
  assert.ok(persistence.includes("@react-native-async-storage/async-storage"));
});

test("tablet layouts use additional width deliberately",()=>{
  const cards=read("src/ui/Cards.tsx");
  const tokens=read("src/theme/tokens.ts");
  assert.ok(tokens.includes("tablet: 768"));
  assert.ok(cards.includes("styles.heroTablet"));
  assert.ok(cards.includes("styles.gridItemTablet"));
  assert.ok(cards.includes("tablet && styles.gridResponsive"));
});

test("appearance preference is HealthTimes-owned and persistent",()=>{
  const appearance=read("app/appearance.tsx");
  const provider=read("src/theme/AppearanceProvider.tsx");
  const persistence=read("src/services/reader-persistence.ts");
  assert.ok(appearance.includes('["system", "light", "dark"]'));
  assert.ok(provider.includes(".getAppearance()"));
  assert.ok(provider.includes(".setAppearance(next)"));
  assert.ok(persistence.includes("ht:nm04:reader:appearance:v1"));
});


test("Phase 6A native flows handle iOS deep links and deterministic offline evidence",()=>{
  const phone=read("e2e/ui02-phase6a-phone.yaml");
  const tablet=read("e2e/ui02-phase6a-tablet.yaml");
  const count=(source,needle)=>source.split(needle).length-1;
  const promptGuard='visible: "Open in .*HealthTimes Dev.*"';
  assert.equal(count(phone,"- openLink:"),count(phone,promptGuard));
  assert.equal(count(tablet,"- openLink:"),count(tablet,promptGuard));
  assert.ok(phone.includes('- openLink: "healthtimes://saved?tab=offline"'));
  assert.equal(phone.includes('- tapOn: "Offline"'),false);
  const searchOpen=phone.indexOf('- openLink: "healthtimes://search"');
  const searchDestination=phone.indexOf('visible: "Intelligent Search"',searchOpen);
  assert.ok(searchOpen>=0);
  assert.ok(searchDestination>searchOpen);
  const searchTransition=phone.slice(searchOpen,searchDestination);
  assert.ok(searchTransition.includes(promptGuard));
  assert.ok(searchTransition.includes('- tapOn: "Open"'));
  assert.equal(searchTransition.includes('visible: "Top Stories"'),false);
  assert.equal(searchTransition.includes('tapOn: "Search HealthTimes"'),false);
  assert.match(
    phone,
    /- openLink: "healthtimes:\/\/search"\n- runFlow:\n    when:\n      platform: iOS\n      visible: "Open in \.\*HealthTimes Dev\.\*"\n    commands:\n      - tapOn: "Open"\n- extendedWaitUntil:\n    visible: "Intelligent Search"\n    timeout: 45000/
  );
  assert.equal((phone.match(/tapOn: "Search HealthTimes"/g)??[]).length,0);  assert.ok(tablet.includes("timeout: 240000"));
});

test("Phase 6A workflow is exact-head and real native-device oriented",()=>{
  const workflow=readRepo(".github/workflows/ui02-phase6a-native-cross-device.yml");
  const androidRunner=readRepo("scripts/native/ui02-phase6a-android-run.sh");
  assert.ok(workflow.includes("Prove exact candidate checkout"));
  assert.ok(workflow.includes("xcrun simctl"));
  assert.ok(workflow.includes("reactivecircus/android-emulator-runner@v2"));
  assert.ok(workflow.includes('maestro --device "$SIM_UDID" test'));
  assert.ok(workflow.includes('xcrun simctl erase "$SIM_UDID"'));
  assert.ok(workflow.includes("runs-on: macos-latest"));
  assert.ok(workflow.includes("Record native Apple toolchain"));
  assert.equal(workflow.includes("version[:2] !="),false);
  assert.ok(workflow.includes('MAESTRO_DRIVER_STARTUP_TIMEOUT: "240000"'));
  assert.ok(workflow.includes("scripts/native/ui02-phase6a-android-run.sh"));
  assert.ok(workflow.includes("Build proven Debug iOS Simulator app"));
  assert.ok(workflow.includes("-configuration Debug"));
  assert.ok(workflow.includes("Debug-iphonesimulator"));
  assert.ok(workflow.includes("EXPO_UNSTABLE_HEADLESS=1 EXPO_NO_DEV_MENU=1 npx expo start --localhost"));
  assert.ok(workflow.includes("Metro did not accept HTTP connections for iOS native evidence"));
  assert.ok(workflow.includes("virtual-metro-entry.bundle?platform=ios"));
  assert.ok(workflow.includes("Metro iOS bundle prewarm failed"));
  assert.ok(workflow.includes('kill -0 "$METRO_PID"'));
  assert.ok(workflow.includes("Build self-contained Android release APK"));
  assert.ok(workflow.includes("./gradlew assembleRelease --no-daemon"));
  assert.ok(androidRunner.includes("app/build/outputs/apk/release/app-release.apk"));
  assert.ok(androidRunner.includes("maestro --device emulator-5554 test"));
  assert.equal(androidRunner.includes("expo start"),false);
  assert.equal(androidRunner.includes("adb reverse"),false);
  assert.ok(androidRunner.includes("ui02-phase6a-manifest.mjs"));
  assert.ok(workflow.includes("ui02-phase6a-native-${{ github.event.pull_request.head.ref || github.ref }}"));
  assert.ok(workflow.includes("ui02-phase6a-native-evidence"));
  assert.ok(read("e2e/ui02-phase6a-phone.yaml").includes("timeout: 120000"));
  assert.ok(read("e2e/ui02-phase6a-phone.yaml").includes('- openLink: "healthtimes://saved?tab=offline"'));
  assert.ok(read("e2e/ui02-phase6a-tablet.yaml").includes('visible: "Save article"'));
  assert.equal(workflow.includes("playwright"),false);
});


test("native push module initializes only after explicit reader registration request",()=>{
  const push=read("src/security/push.ts");
  assert.equal(push.includes('import * as Notifications from "expo-notifications"'),false);
  assert.ok(push.includes('await import("expo-notifications")'));
});


test("Phase 6A evidence is current-attempt scoped and fails closed on native runtime errors",()=>{
  const workflow=readRepo(".github/workflows/ui02-phase6a-native-cross-device.yml");
  const manifest=readRepo("scripts/native/ui02-phase6a-manifest.mjs");
  assert.ok(workflow.includes('RUN_ATTEMPT: ${{ github.run_attempt }}'));
  assert.ok(workflow.includes('int(m.get("runAttempt",-1))==current_attempt'));
  assert.ok(workflow.includes('"runtimeErrorCells":runtime_error_cells'));
  assert.ok(manifest.includes("Actionable native runtime errors detected"));
  assert.ok(manifest.includes("runAttempt"));
});


test("Phase 6A tablet Home portrait evidence is captured only after the resolved landscape Home pass",()=>{
  const tablet=read("e2e/ui02-phase6a-tablet.yaml");
  const landscape=tablet.indexOf("- takeScreenshot: tablet-home-landscape");
  const portraitCapture=tablet.lastIndexOf("- takeScreenshot: tablet-home");
  assert.ok(landscape>=0);
  assert.ok(portraitCapture>landscape);
  const transition=tablet.slice(landscape,portraitCapture);
  assert.ok(transition.includes("platform: iOS"));
  assert.ok(transition.includes("- setOrientation: PORTRAIT"));
  assert.ok(transition.includes("platform: Android"));
  assert.ok(transition.includes("- setOrientation: LANDSCAPE_LEFT"));
  assert.ok(transition.includes("- waitForAnimationToEnd"));
});


test("Phase 6A Android tablet certification validates physical PNG orientation",()=>{
  const tablet=read("e2e/ui02-phase6a-tablet.yaml");
  const manifestSource=readRepo("scripts/native/ui02-phase6a-manifest.mjs");
  assert.ok(tablet.includes("Pixel Tablet's natural device orientation"));
  assert.ok(tablet.includes("platform: Android"));
  assert.ok(manifestSource.includes('platform==="Android" && deviceClass==="tablet"'));
  assert.ok(manifestSource.includes("readUInt32BE(16)"));
  assert.ok(manifestSource.includes("readUInt32BE(20)"));
  assert.ok(manifestSource.includes("ANDROID TABLET PORTRAIT SCREENSHOT IS NOT PHYSICALLY PORTRAIT"));
  assert.ok(manifestSource.includes("ANDROID TABLET LANDSCAPE SCREENSHOT IS NOT PHYSICALLY LANDSCAPE"));
  assert.ok(manifestSource.includes("physicalOrientation"));
  assert.ok(manifestSource.includes("screenshotWidth"));
  assert.ok(manifestSource.includes("screenshotHeight"));

  const evidenceDir=mkdtempSync(join(tmpdir(),"ui02-phase6a-orientation-"));
  const manifestPath=join(repoRoot,"scripts/native/ui02-phase6a-manifest.mjs");
  const tabletScreens=[
    "tablet-home","tablet-article","tablet-watch","tablet-my-healthtimes","tablet-edition","tablet-home-landscape"
  ];
  const writePngStub=(name,width,height)=>{
    const png=Buffer.alloc(24);
    Buffer.from([137,80,78,71,13,10,26,10]).copy(png,0);
    png.writeUInt32BE(13,8);
    png.write("IHDR",12,"ascii");
    png.writeUInt32BE(width,16);
    png.writeUInt32BE(height,20);
    writeFileSync(join(evidenceDir,name+".png"),png);
  };
  const runManifest=()=>spawnSync(process.execPath,[manifestPath],{
    env:{
      ...process.env,
      EVIDENCE_DIR:evidenceDir,
      CANDIDATE_SHA:"orientation-contract",
      RUN_ATTEMPT:"1",
      NATIVE_PLATFORM:"Android",
      DEVICE_CLASS:"tablet",
      DEVICE_IDENTITY:"Pixel Tablet contract fixture",
      OS_VERSION:"test",
      ORIENTATION:"portrait"
    },
    encoding:"utf8"
  });

  try{
    for(const screen of tabletScreens) writePngStub(screen,1600,2560);
    writePngStub("tablet-home-landscape",2560,1600);

    const valid=runManifest();
    assert.equal(valid.status,0,valid.stderr||valid.stdout);
    const manifest=JSON.parse(readFileSync(join(evidenceDir,"manifest.json"),"utf8"));
    const portrait=manifest.screens.find((screen)=>screen.screen==="tablet-home");
    const landscape=manifest.screens.find((screen)=>screen.screen==="tablet-home-landscape");
    assert.deepEqual(
      [portrait.screenshotWidth,portrait.screenshotHeight,portrait.physicalOrientation,portrait.orientation],
      [1600,2560,"portrait","portrait"]
    );
    assert.deepEqual(
      [landscape.screenshotWidth,landscape.screenshotHeight,landscape.physicalOrientation,landscape.orientation],
      [2560,1600,"landscape","landscape"]
    );

    writePngStub("tablet-home",2560,1600);
    const badPortrait=runManifest();
    assert.notEqual(badPortrait.status,0);
    assert.match(badPortrait.stderr+badPortrait.stdout,/ANDROID TABLET PORTRAIT SCREENSHOT IS NOT PHYSICALLY PORTRAIT/);

    writePngStub("tablet-home",1600,2560);
    writePngStub("tablet-home-landscape",1600,2560);
    const badLandscape=runManifest();
    assert.notEqual(badLandscape.status,0);
    assert.match(badLandscape.stderr+badLandscape.stdout,/ANDROID TABLET LANDSCAPE SCREENSHOT IS NOT PHYSICALLY LANDSCAPE/);
  } finally {
    rmSync(evidenceDir,{recursive:true,force:true});
  }
});


test("Phase 6A Android System UI ANR recovery is single in-job and fail-closed",()=>{
  const runner=readRepo("scripts/native/ui02-phase6a-android-run.sh");
  const workflow=readRepo(".github/workflows/ui02-phase6a-native-cross-device.yml");
  const phone=read("e2e/ui02-phase6a-phone.yaml");

  for(const marker of [
    "System UI isn't responding",
    "android:id/aerr_wait",
    "com.android.systemui:id/",
    "dumpsys activity lastanr",
    "dumpsys SurfaceFlinger --list",
    "HealthTimes application ANR is not recoverable",
    "HealthTimes application ANR dialog is not recoverable",
    "FATAL EXCEPTION",
    "AndroidRuntime",
    "ReactNativeJS",
    "maestro-journey-1",
    "maestro-journey-2",
    "first-journey.tar.gz",
    "infrastructure-recovery.yaml",
    "recoveryCount:1",
    'firstJourneyResult:"INTERRUPTED_BY_OS"',
    'secondJourneyResult:"PASS"',
    'if [[ "$SECOND_STATUS" -ne 0 ]]',
    'exit "$SECOND_STATUS"',
    "no further recovery permitted"
  ]) assert.ok(runner.includes(marker),marker);

  assert.match(
    phone,
    /- launchApp:\n    clearState: true\n- extendedWaitUntil:\n    visible: "Top Stories"\n    timeout: 240000/
  );
  assert.equal((phone.match(/visible: "Top Stories"/g)??[]).length,5);

  assert.equal(
    (runner.match(/run_maestro_journey "\$FIRST_JOURNEY_DIR"/g)??[]).length,
    1
  );
  assert.equal(
    (runner.match(/run_maestro_journey "\$SECOND_JOURNEY_DIR"/g)??[]).length,
    1
  );
  assert.equal(
    (workflow.match(/scripts\/native\/ui02-phase6a-android-run\.sh/g)??[]).length,
    1
  );
  assert.equal(runner.includes("gh run rerun"),false);
  assert.equal(workflow.includes("rerun-failed"),false);
  assert.ok(runner.includes('grep -Fq "$APP_ID" "$RECOVERY_DIR/lastanr-before-recovery.txt"'));
  assert.equal(runner.includes('grep -Fq "com.android.systemui" "$RECOVERY_DIR/lastanr-before-recovery.txt"'),false);
  assert.ok(runner.includes('"foregroundOwnershipEvidence": "infrastructure-recovery/system-ui-anr-hierarchy.json"'));
  assert.ok(runner.includes('"lastAnrDiagnostic": "infrastructure-recovery/lastanr-before-recovery.txt"'));
  assert.ok(runner.includes('grep -Fq "$APP_ID" "$RECOVERY_DIR/surfaceflinger-before-recovery.txt"'));
  assert.ok(runner.includes('rm -rf "$FIRST_JOURNEY_DIR"'));
});
