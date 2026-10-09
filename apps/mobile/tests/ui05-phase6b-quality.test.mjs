import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("Phase 6B shared primitives preserve touch, focus, loading and narrow-layout accessibility",()=>{
  const layout=read("src/ui/Layout.tsx");
  const toolbar=read("src/ui/ArticleToolbar.tsx");

  assert.match(layout,/accessibilityRole="button"/);
  assert.match(layout,/accessibilityState=\{\{ selected: active \}\}/);
  assert.match(layout,/onFocus=\{\(\) => setFocused\(true\)\}/);
  assert.match(layout,/chipFocused:\{borderWidth:2\}/);
  assert.match(layout,/maxWidth:"100%"/);
  assert.match(layout,/phoneSearchAction/);
  assert.match(layout,/searchIconButton:\{marginLeft:"auto",width:layout\.touchMin,height:layout\.touchMin/);
  assert.match(layout,/accessibilityLabel="Search HealthTimes"/);
  assert.doesNotMatch(layout,/narrowHeaderInner:\{flexWrap:"wrap"/);
  assert.match(layout,/accessibilityRole="progressbar"/);
  assert.match(layout,/accessibilityLabel=\{label\}/);

  assert.match(toolbar,/minHeight: layout\.touchMin/);
  assert.match(toolbar,/accessibilityHint="Stores this eligible article on this device for offline reading"/);
  assert.match(toolbar,/actionFocused: \{ borderWidth: 2 \}/);
});

test("Phase 6B My HealthTimes unavailable rows expose disabled interaction semantics",()=>{
  const my=read("app/(reader)/my.tsx");
  assert.match(my,/accessibilityRole=\{item\.url \? "link" : "button"\}/);
  assert.match(my,/accessibilityState=\{\{disabled:!item\.path&&!item\.url\}\}/);
  assert.match(my,/accessibilityLabel=\{item\.detail \? item\.label\+"\. "\+item\.detail : item\.label\}/);
  assert.match(my,/flexWrap:"wrap"/);
  assert.match(my,/flexShrink:1/);
});

test("Phase 6B Premium and status accents are dark-mode aware",()=>{
  const appearance=read("src/theme/AppearanceProvider.tsx");
  const paywall=read("src/ui/PremiumPaywall.tsx");
  const cards=read("src/ui/Cards.tsx");
  const premium=read("app/premium.tsx");
  const article=read("app/article/[id].tsx");

  assert.match(appearance,/premium: string/);
  assert.match(appearance,/success: string/);
  assert.match(appearance,/premium: "#E6C16A"/);
  assert.match(appearance,/success: "#63C58E"/);
  assert.match(paywall,/borderTopColor: palette\.premium/);
  assert.match(cards,/color:palette\.premium,borderColor:palette\.premium/);
  assert.match(premium,/color:palette\.premium/);
  assert.match(article,/color:palette\.success/);
  assert.match(article,/borderColor:palette\.premium/);
});

test("Phase 6B keeps offline failure copy reader-facing and preserves ownership truth",()=>{
  const article=read("app/article/[id].tsx");
  const saved=read("app/saved.tsx");

  assert.match(article,/Offline download isn't available for Premium articles on this device\./);
  const readerMessages=[...article.matchAll(/setActionStatus\("([^"]+)"\)/g)].map((match)=>match[1]).join(" ");
  assert.doesNotMatch(readerMessages,/offline entitlement policy|Premium persistence|provider authority|canonical state|without entitlement/i);
  assert.match(saved,/Saving a story does not download it for offline reading/);
  assert.match(saved,/Premium stories are not stored here without verified offline access/);
});

test("Phase 6B evidence fails closed on runtime errors, overflow and exact-head drift",()=>{
  const workflow=read("../../.github/workflows/ui05-phase6b-accessibility-states-responsive.yml");
  const evidence=read("tests/ui05-phase6b-evidence.mjs");

  assert.match(workflow,/Prove exact candidate checkout/);
  assert.match(workflow,/test:ui05/);
  assert.match(workflow,/test:ui04/);
  assert.match(workflow,/ui02-phase6a-native\.test\.mjs/);
  assert.match(workflow,/test:premium-hospaz/);
  assert.match(workflow,/test:migrated-corpus/);
  assert.match(workflow,/phase10-visual-conformance\.test\.mjs/);
  assert.match(evidence,/pageErrors/);
  assert.match(evidence,/consoleErrors/);
  assert.match(evidence,/React #418/);
  assert.match(evidence,/horizontal overflow/i);
  assert.match(evidence,/320,844/);
  assert.match(evidence,/390,844/);
  assert.match(evidence,/834,1112/);
  assert.match(evidence,/1440,1000/);
  for(const route of ["\/","\/article\/","\/premium","\/watch","\/my"]){
    assert.match(evidence,new RegExp(route.replaceAll("/","\\/")));
  }
  assert.match(evidence,/reducedMotion:"reduce"/);
});


test("Phase 6B evidence certifies resolved Article, Home and explicit state outcomes",()=>{
  const evidence=read("tests/ui05-phase6b-evidence.mjs");

  const articleContract=evidence.match(/async function requireResolvedArticle[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(articleContract,/getByRole\("button",\{name:"Save article"\}\)\.waitFor/);
  assert.match(articleContract,/document\.body\.innerText\.includes\(headline\)/);
  assert.match(articleContract,/articleHeadline,/);
  assert.match(articleContract,/requireNoLoading\(page,label,\["Loading article…"\]\)/);
  assert.match(articleContract,/articleResolved:true/);

  const desktopArticle=evidence.match(/\{name:"desktop-article"[\s\S]*?\n\s*\}/)?.[0] ?? "";
  assert.match(desktopArticle,/readiness:requireResolvedArticle/);
  assert.match(desktopArticle,/loadingMarkers:\["Loading article…"\]/);

  const darkLoop=evidence.match(/for\(const \[name,route,ready\][\s\S]*?await context\.close\(\);\n\s*\}/)?.[0] ?? "";
  assert.match(darkLoop,/name==="dark-article"\s*\?\s*await requireResolvedArticle\(page,name\)/);
  assert.match(darkLoop,/name==="dark-home"\s*\?\s*await requireResolvedHome\(page,name\)/);

  const homeContract=evidence.match(/async function requireResolvedHome[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(homeContract,/document\.body\.innerText\.includes\(marker\)/);
  assert.match(homeContract,/"Top Stories",/);
  assert.match(homeContract,/requireNoLoading\(page,label,\["Loading Home…"\]\)/);
  assert.match(homeContract,/homeResolved:true/);

  const reducedMotion=evidence.match(/name:"reduced-motion-home"[\s\S]*?contextOptions:\{reducedMotion:"reduce"\}[\s\S]*?\n\s*\}\);/)?.[0] ?? "";
  assert.match(reducedMotion,/readiness:requireResolvedHome/);
  assert.match(reducedMotion,/loadingMarkers:\["Loading Home…"\]/);
  assert.doesNotMatch(reducedMotion,/ready:"HealthTimes"/);

  const resolvedCapture=evidence.match(/if\(expectedState==="resolved"\)\{[\s\S]*?\}else if\(expectedState==="loading"\)/)?.[0] ?? "";
  assert.match(resolvedCapture,/const resolution=readiness \? await readiness\(page,name\) : \{\}/);
  assert.match(resolvedCapture,/const loading=await requireNoLoading\(page,name,loadingMarkers\)/);

  const stateContract=evidence.match(/async function requireApprovedState[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(stateContract,/allowed\.some\(text=>document\.body\.innerText\.includes\(text\)\)/);
  assert.match(stateContract,/requireNoLoading\(page,label,loadingMarkers\)/);
  assert.match(stateContract,/if\(!resolved\) throw new Error/);
  assert.doesNotMatch(evidence,/populated\/other truthful resolved state/);

  assert.match(evidence,/\["saved-state","\/saved\?tab=saved",\["Nothing saved yet","Available offline"\],\["Loading your library…"\]\]/);
  assert.match(evidence,/\["live-state","\/live",\["No live coverage right now","Live now","Upcoming coverage","Live blogs"\],\["Loading live coverage…"\]\]/);
  assert.match(evidence,/\["listen-state","\/listen",\["No audio published yet","Featured audio"\],\["Loading audio…"\]\]/);
  assert.match(evidence,/\["premium-state","\/premium",\["Membership options aren't available here yet","Membership options"\],\["Checking membership options…","Loading Premium journalism…"\]\]/);
});
