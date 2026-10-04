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
  assert.match(layout,/narrowPhone = width > 0 && width < 360/);
  assert.match(layout,/narrowHeaderInner:\{flexWrap:"wrap"/);
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
