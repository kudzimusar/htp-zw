import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(path)=>readFileSync(join(root,path),"utf8");

test("UI-03 Premium prompt is a bounded responsive acquisition surface",()=>{
  const prompt=read("src/ui/PremiumSubscriptionPrompt.tsx");
  assert.match(prompt,/Modal/);
  assert.match(prompt,/testID="premium-subscription-prompt"/);
  assert.match(prompt,/accessibilityViewIsModal/);
  assert.match(prompt,/accessibilityRole="dialog"/);
  assert.match(prompt,/HealthTimes Premium membership prompt/);
  assert.match(prompt,/phone \? styles\.backdropPhone : styles\.backdropCentered/);
  assert.match(prompt,/maxWidth: 600/);
  assert.match(prompt,/maxHeight: "88%"/);
  assert.match(prompt,/HEALTHTIMES PREMIUM/);
  assert.match(prompt,/Keep reading with HealthTimes Premium/);
  assert.match(prompt,/Explore Premium/);
  assert.match(prompt,/Become Premium/);
  assert.match(prompt,/Member sign in/);
  assert.match(prompt,/Not now/);
  assert.match(prompt,/event\.key === "Escape"/);
  assert.match(prompt,/onRequestClose=\{onDismiss\}/);
  assert.match(prompt,/minHeight: layout\.touchMin/);
  assert.doesNotMatch(prompt,/US\$|USD|ZWL|Most Popular|Best Value|discount|free trial/i);
});

test("UI-03 Article opens the prompt only from NM-05 expired one-shot authority",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/premiumPreviewConsumerState/);
  assert.match(article,/premiumPreview\.state!=="expired" \|\| premiumPreview\.promptRequested!==true/);
  assert.match(article,/premiumPromptOpenedSession\.current===sessionKey/);
  assert.match(article,/premiumPromptOpenedSession\.current=sessionKey/);
  assert.match(article,/setPremiumPromptVisible\(true\)/);
  assert.match(article,/premiumPreview\.state==="expired"/);
  assert.match(article,/premiumPreview\.promptRequested===true/);
  assert.match(article,/requestPremiumPreviewPrompt/);
  assert.match(article,/getPremiumPreviewWindow/);
  assert.match(article,/previewConfig\.seconds===20/);
  assert.doesNotMatch(article,/setPremiumPromptVisible\(true\)[\s\S]{0,400}Date\.now\(/);
});

test("UI-03 dismissal leaves the inline paywall and never restarts teaser authority",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/const dismissPremiumPrompt=\(\)=>\{\s*setPremiumPromptVisible\(false\);\s*\}/);
  assert.match(article,/PremiumPaywall/);
  assert.match(article,/onDismiss=\{dismissPremiumPrompt\}/);
  assert.doesNotMatch(article,/dismissPremiumPrompt[\s\S]{0,350}getPremiumPreviewWindow/);
  assert.doesNotMatch(article,/dismissPremiumPrompt[\s\S]{0,350}setPremiumState\("preview"\)/);
  assert.doesNotMatch(article,/dismissPremiumPrompt[\s\S]{0,350}setPremiumRemainingSeconds\(20\)/);
});

test("UI-03 teaser countdown consumes NM-05 remainingSeconds without accessibility spam",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/Premium preview · "\+premiumPreview\.remainingSeconds\+" seconds remaining"/);
  assert.match(article,/premiumPreview\.state==="warning"/);
  assert.match(article,/Your Premium preview is ending soon/);
  assert.match(article,/accessibilityLiveRegion=\{premiumPreview\.state==="warning" \? "polite" : undefined\}/);
  assert.match(article,/premiumTeaserBlock/);
  assert.match(article,/authorized first-paragraph preview/);
  assert.doesNotMatch(article,/setInterval[\s\S]{0,600}setPremiumPromptVisible/);
});

test("UI-03 acquisition stays fail-closed and native never invokes Web checkout",()=>{
  const article=read("app/article/[id].tsx");
  assert.match(article,/Platform\.OS!=="web" \|\| !premiumPreview\.commerceAvailable/);
  assert.match(article,/router\.push\("\/premium" as never\)/);
  assert.match(article,/services\.premiumCommerce\.startCheckout/);
  assert.match(article,/result\.status==="redirect-required"/);
  assert.match(article,/\^https:\\\/\\\//i);
  assert.doesNotMatch(article,/subscription_completed/);
  assert.doesNotMatch(article,/setEntitlement|grantEntitlement|entitlement\.data\s*=/);
});

test("UI-03 existing-member action routes through accepted account authority",()=>{
  const article=read("app/article/[id].tsx");
  const prompt=read("src/ui/PremiumSubscriptionPrompt.tsx");
  assert.match(article,/router\.push\("\/account-access" as never\)/);
  assert.match(prompt,/accessibilityLabel="Member sign in"/);
});

test("UI-03 protected body remains independent from the acquisition popup",()=>{
  const article=read("app/article/[id].tsx");
  const sourceParity=read("src/services/source-parity.ts");
  assert.match(sourceParity,/bodyHtml:accessPolicy==="premium" \? null/);
  assert.match(article,/parseArticleContent\(protectedBody \? null : story\.bodyHtml/);
  assert.match(article,/services\.premium\.getProtectedArticle/);
  assert.match(article,/entitlement\.data!==true/);
  assert.doesNotMatch(read("src/ui/PremiumSubscriptionPrompt.tsx"),/bodyHtml|getProtectedArticle|premiumTeaserHtml|WordPress|wp-json/i);
});
