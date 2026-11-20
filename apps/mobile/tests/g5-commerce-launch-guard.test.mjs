// HT-MVP-PUBLIC-LAUNCH-01-G5/G4/G6: Reader-only launch keeps every purchase path closed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");
function load(path) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", "process", output)(module, module.exports, () => { throw new Error("Unexpected require"); }, process);
  return module.exports;
}
const policy = load("src/growth/purchase-policy.ts");

test("commerce is off unless the build explicitly sets EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED=true", () => {
  const saved = process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED;
  delete process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED;
  try {
    assert.equal(policy.launchCommerceEnabled(), false, "default build");
  } finally {
    if (saved !== undefined) process.env.EXPO_PUBLIC_HEALTHTIMES_COMMERCE_ENABLED = saved;
  }
  for (const value of [undefined, "", "1", "yes", "on", "false", "enabled"]) assert.equal(policy.launchCommerceEnabled(value), false, String(value));
  for (const value of ["true", " TRUE "]) assert.equal(policy.launchCommerceEnabled(value), true, value);
});

test("a server that reports checkout available is still treated as unavailable while launch commerce is off", () => {
  assert.equal(policy.effectiveCommerceStatus("available", false), "unavailable");
  assert.equal(policy.effectiveCommerceStatus("configuration-required", false), "unavailable");
  assert.equal(policy.effectiveCommerceStatus("loading", false), "loading");
  assert.equal(policy.effectiveCommerceStatus("available", true), "available");
});

test("native apps never open an external checkout and need store billing to sell", () => {
  for (const platform of ["ios", "android"]) {
    assert.equal(policy.mayOpenCheckoutUrl({ platform, commerceEnabled: true, url: "https://www.paynow.co.zw/x" }), false);
    assert.deepEqual({ ...policy.purchaseChannels({ platform, commerceEnabled: true, webAuthorityAvailable: true, storeConfigured: false }) }, { webCheckout: false, nativeStore: false });
    assert.deepEqual({ ...policy.purchaseChannels({ platform, commerceEnabled: false, webAuthorityAvailable: true, storeConfigured: true }) }, { webCheckout: false, nativeStore: false });
  }
  assert.equal(policy.mayOpenCheckoutUrl({ platform: "web", commerceEnabled: false, url: "https://www.paynow.co.zw/x" }), false);
  assert.equal(policy.mayOpenCheckoutUrl({ platform: "web", commerceEnabled: true, url: "http://www.paynow.co.zw/x" }), false);
  assert.equal(policy.mayOpenCheckoutUrl({ platform: "web", commerceEnabled: true, url: "javascript:alert(1)" }), false);
  assert.equal(policy.mayOpenCheckoutUrl({ platform: "web", commerceEnabled: true, url: "https://www.paynow.co.zw/interface/x" }), true);
});

test("article and Premium screens consult the launch policy before any checkout", () => {
  const article = read("app/article/[id].tsx");
  assert.match(article, /commerceStatus:commerce\.loading \? "loading" : effectiveCommerceStatus\(commerce\.data\?\.status \?\? "unavailable"\)/);
  assert.match(article, /mayOpenCheckoutUrl\(\{platform:Platform\.OS,commerceEnabled:launchCommerceEnabled\(\),url:checkoutUrl\}\)/);
  assert.match(article, /if\(Platform\.OS!=="web" \|\| !premiumPreview\.commerceAvailable\)\{\s*setPremiumPromptVisible\(false\);\s*router\.push\("\/premium" as never\);/);
  const premium = read("app/premium.tsx");
  assert.match(premium, /const commerceEnabled=launchCommerceEnabled\(\);/);
  assert.match(premium, /const webOfferAvailable=Boolean\(\s*commerceEnabled &&/);
  assert.match(premium, /const storeOffersAvailable=Boolean\(\s*commerceEnabled &&/);
  assert.match(premium, /mayOpenCheckoutUrl\(\{platform:Platform\.OS,commerceEnabled,url:result\.checkoutUrl\}\)/);
  // Every Linking.openURL of a checkout URL is behind the policy check.
  for (const source of [article, premium]) {
    const opens = [...source.matchAll(/Linking\.openURL\((checkoutUrl|result\.checkoutUrl[^)]*)\)/g)];
    assert.ok(opens.length >= 1);
    for (const open of opens) {
      const before = source.slice(Math.max(0, open.index - 400), open.index);
      assert.match(before, /mayOpenCheckoutUrl\(/, "unguarded checkout open");
    }
  }
});

test("native Premium never offers 'Restore purchases' until store billing is configured (G6)", () => {
  const premium = read("app/premium.tsx");
  assert.match(premium, /const storeRestoreAvailable=!webCommerce && premiumStoreConfigurationReady\(\);/);
  assert.equal((premium.match(/>Restore purchases<\/Text>/g) || []).length, 3);
  // Every Restore purchases control sits inside a storeRestoreAvailable guard.
  for (const match of premium.matchAll(/>Restore purchases<\/Text>/g)) {
    const before = premium.slice(Math.max(0, match.index - 700), match.index);
    assert.match(before, /\{storeRestoreAvailable && \(/, "unguarded Restore purchases control");
  }
  assert.match(premium, /: "Already a member\? Sign in to recover your HealthTimes Premium access\."\}/);
  assert.match(premium, /Already a member\? Sign in to restore your HealthTimes Premium access/, "web copy preserved");
  const store = read("src/growth/premium-store.ts");
  assert.match(store, /status: "configuration-required"/);
});

test("with commerce off neither screen requests /api/commerce (no 401/SSO noise on protected Previews)", () => {
  const premium = read("app/premium.tsx");
  assert.match(premium, /const commerce=useAsync\(\(\)=>launchCommerceEnabled\(\) \? services\.premiumCommerce\.getAuthority\(\) : Promise\.resolve\(null\),\[\]\);/);
  const article = read("app/article/[id].tsx");
  // The commerce gate comes first so the frozen P0 article contract literal
  // (p0-reader-recovery-contract: Premium-only authority request) stays intact.
  assert.match(article, /const commerce=useAsync\(\(\)=>!launchCommerceEnabled\(\) \? Promise\.resolve\(null\) : article\.data\?\.accessPolicy==="premium" \? services\.premiumCommerce\.getAuthority\(\) : Promise\.resolve\(null\),/);
  for (const source of [premium, article]) {
    const calls = [...source.matchAll(/services\.premiumCommerce\.getAuthority\(\)/g)];
    for (const call of calls) {
      assert.match(source.slice(Math.max(0, call.index - 120), call.index), /launchCommerceEnabled\(\)/, "ungated commerce authority request");
    }
  }
});
