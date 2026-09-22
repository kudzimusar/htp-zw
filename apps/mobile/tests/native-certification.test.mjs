import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const repoRoot=join(root,"..","..");
const read=(path)=>readFileSync(join(root,path),"utf8");
const readRepo=(path)=>readFileSync(join(repoRoot,path),"utf8");

test("native environment identities are explicit and separated",()=>{
  const config=read("app.config.ts");
  assert.ok(config.includes('"zw.co.healthtimes.app" + suffix'));
  assert.ok(config.includes('environment === "staging" ? ".staging" : ".dev"'));
  assert.ok(config.includes('scheme: "healthtimes"'));
  assert.ok(config.includes('supportsTablet: true'));
});

test("development staging and production build profiles remain distinct",()=>{
  const eas=JSON.parse(read("eas.json"));
  assert.equal(eas.build.development.env.APP_ENV,"development");
  assert.equal(eas.build.staging.env.APP_ENV,"staging");
  assert.equal(eas.build.production.env.APP_ENV,"production");
  assert.equal(eas.build.development.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE,"fixture");
  assert.equal(eas.build.staging.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE,"fixture");
  assert.equal(eas.build.production.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE,"production");
});

test("production services remain fail-closed before integrated backend certification",()=>{
  const services=read("src/services/index.ts");
  assert.ok(services.includes('appEnvironment === "production"'));
  assert.ok(services.includes("Production service adapters are locked"));
  assert.ok(services.includes("Staging editorial-data mode is locked until AG-04"));
});

test("NM-07 workflow compiles Android and iOS from the same branch",()=>{
  const workflow=readRepo(".github/workflows/native-certification.yml");
  assert.ok(workflow.includes("android-debug-binary:"));
  assert.ok(workflow.includes("ios-simulator-binary:"));
  assert.ok(workflow.includes("npx expo prebuild --platform android"));
  assert.ok(workflow.includes("./gradlew assembleDebug"));
  assert.ok(workflow.includes("npx expo prebuild --platform ios"));
  assert.ok(workflow.includes("xcodebuild"));
  assert.ok(workflow.includes("CODE_SIGNING_ALLOWED=NO"));
  assert.ok(workflow.includes("healthtimes-android-debug-apk"));
  assert.ok(workflow.includes("healthtimes-ios-simulator-app"));
});

test("binary CI does not claim physical-device or signed-store certification",()=>{
  const workflow=readRepo(".github/workflows/native-certification.yml");
  assert.equal(workflow.includes("eas submit"),false);
  assert.equal(workflow.includes("play-store"),false);
  assert.equal(workflow.includes("app-store"),false);
  assert.equal(workflow.includes("distribution: store"),false);
});

test("native signing credentials and Expo project identity are not fabricated",()=>{
  const config=read("app.config.ts");
  const eas=read("eas.json");
  assert.equal(/projectId\s*:/.test(config),false);
  assert.equal(/EXPO_TOKEN|ASC_API_KEY|APPLE_TEAM_ID|ANDROID_KEYSTORE|GOOGLE_SERVICE_ACCOUNT/i.test(config+"\n"+eas),false);
});


test("feature-branch PWA preview uses its own deployment environment",()=>{
  const pages=readRepo(".github/workflows/pages.yml");
  assert.ok(pages.includes("feat/native-mobile-nm07-native-certification"));
  assert.ok(pages.includes("name: github-pages-preview"));
  assert.ok(pages.includes("actions/deploy-pages@v4"));
});
