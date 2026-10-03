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
const swiftPackagePath=join(moduleRoot,"apple","Package.swift");

for(const path of [packagePath,headerPath,swiftPackagePath]){
  if(!existsSync(path)){
    throw new Error(`expo-modules-jsi compatibility patch target is missing: ${path}`);
  }
}

const packageJson=JSON.parse(readFileSync(packagePath,"utf8"));
if(typeof packageJson.version!=="string" || !packageJson.version.startsWith("57.")){
  throw new Error(`Refusing ExpoModulesJSI compatibility workaround outside 57.x (found ${packageJson.version ?? "unknown"})`);
}

const annotated="SWIFT_RETURNS_RETAINED RuntimeScheduler(";
let header=readFileSync(headerPath,"utf8");
const annotationCount=header.split(annotated).length-1;
if(annotationCount===2){
  header=header.replaceAll(annotated,"RuntimeScheduler(");
  writeFileSync(headerPath,header);
}else if(annotationCount===0){
  if(!header.includes("RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept") || !header.includes("RuntimeScheduler() {}")){
    throw new Error("RuntimeScheduler constructors do not match the known Expo SDK 57 shape");
  }
}else{
  throw new Error(`Expected zero or two invalid RuntimeScheduler ownership annotations; found ${annotationCount}`);
}

let swiftPackage=readFileSync(swiftPackagePath,"utf8");
const swift6="swiftLanguageModes: [.v6]";
const swift5="swiftLanguageModes: [.v5]";
const swift6Count=swiftPackage.split(swift6).length-1;
const swift5Count=swiftPackage.split(swift5).length-1;
if(swift6Count===1 && swift5Count===0){
  swiftPackage=swiftPackage.replace(swift6,swift5);
  writeFileSync(swiftPackagePath,swiftPackage);
}else if(!(swift6Count===0 && swift5Count===1)){
  throw new Error(`ExpoModulesJSI Swift language mode does not match the bounded workaround shape (v6=${swift6Count}, v5=${swift5Count})`);
}

const verifiedHeader=readFileSync(headerPath,"utf8");
const verifiedPackage=readFileSync(swiftPackagePath,"utf8");
if(verifiedHeader.includes(annotated)){
  throw new Error("RuntimeScheduler ownership annotation workaround did not apply cleanly");
}
if(!verifiedPackage.includes(swift5) || verifiedPackage.includes(swift6)){
  throw new Error("ExpoModulesJSI Swift 5 compatibility mode did not apply cleanly");
}

console.log(`expo-modules-jsi ${packageJson.version}: applied bounded Swift 6.2+ compatibility workaround`);
