import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir=dirname(fileURLToPath(import.meta.url));
const mobileRoot=join(scriptDir,"..");
const moduleRoot=join(mobileRoot,"node_modules","expo-modules-jsi");
const packagePath=join(moduleRoot,"package.json");
const headerPath=join(
  moduleRoot,
  "apple",
  "Sources",
  "ExpoModulesJSI-Cxx",
  "include",
  "RuntimeScheduler.h"
);

if(!existsSync(packagePath) || !existsSync(headerPath)){
  throw new Error("expo-modules-jsi RuntimeScheduler patch target is missing");
}

const packageJson=JSON.parse(readFileSync(packagePath,"utf8"));
if(typeof packageJson.version!=="string" || !packageJson.version.startsWith("57.")){
  throw new Error(`Refusing RuntimeScheduler workaround outside expo-modules-jsi 57.x (found ${packageJson.version ?? "unknown"})`);
}

const source=readFileSync(headerPath,"utf8");
const annotated="SWIFT_RETURNS_RETAINED RuntimeScheduler(";
const annotationCount=source.split(annotated).length-1;

if(annotationCount===0){
  if(!source.includes("RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept") || !source.includes("RuntimeScheduler() {}")){
    throw new Error("RuntimeScheduler constructors do not match the known Expo SDK 57 shape");
  }
  console.log(`expo-modules-jsi ${packageJson.version}: RuntimeScheduler workaround already unnecessary/applied`);
  process.exit(0);
}

if(annotationCount!==2){
  throw new Error(`Expected exactly two invalid RuntimeScheduler ownership annotations; found ${annotationCount}`);
}

const patched=source.replaceAll(annotated,"RuntimeScheduler(");
writeFileSync(headerPath,patched);

const verified=readFileSync(headerPath,"utf8");
if(verified.includes(annotated)){
  throw new Error("RuntimeScheduler ownership annotation workaround did not apply cleanly");
}

console.log(`expo-modules-jsi ${packageJson.version}: removed two invalid RuntimeScheduler constructor ownership annotations for Swift 6.2+ compatibility`);
