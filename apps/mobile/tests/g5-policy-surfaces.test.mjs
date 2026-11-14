// HT-MVP-PUBLIC-LAUNCH-01-G5: draft policy surfaces stay truthful and visibly unapproved.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "../..");
const read = path => readFileSync(join(root, path), "utf8");
function load(path) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, () => { throw new Error("Unexpected require"); });
  return module.exports;
}
const legal = load("src/legal/policy-drafts.ts");

test("three public policies exist as routes and are explicitly unapproved drafts", () => {
  assert.deepEqual(legal.POLICY_DRAFTS.map(p => p.path), ["/privacy", "/terms", "/subscription-terms"]);
  for (const policy of legal.POLICY_DRAFTS) {
    assert.equal(policy.status, "draft-pending-legal-review");
    assert.equal(policy.approvedBy, null);
    assert.match(policy.version, /^draft-\d{4}-\d{2}-\d{2}$/);
    assert.ok(policy.sections.length >= 5);
    for (const section of policy.sections) assert.ok((section.facts?.length || 0) + (section.decisions?.length || 0) > 0, section.heading);
    const route = read("app" + policy.path + ".tsx");
    assert.match(route, new RegExp('policyByKey\\("' + policy.key + '"\\)'));
  }
  assert.equal(legal.policiesApprovedForLaunch(), false, "G5 launch gate stays closed until legal approval");
  const approved = legal.POLICY_DRAFTS.map(p => ({ ...p, status: "approved", approvedBy: "Named legal reviewer" }));
  assert.equal(legal.policiesApprovedForLaunch(approved), true);
  assert.equal(legal.policiesApprovedForLaunch(approved.map((p, i) => (i ? p : { ...p, approvedBy: null }))), false);
});

test("drafts state facts and open decisions, never approved legal commitments", () => {
  const text = JSON.stringify(legal.POLICY_DRAFTS);
  for (const phrase of [/you agree/i, /we guarantee/i, /refunds? (are|will be) (issued|given)/i, /within \d+ days/i, /we will never/i]) {
    assert.doesNotMatch(text, phrase);
  }
  const screen = read("src/ui/PolicyDocument.tsx");
  assert.match(screen, /Draft — not yet published/);
  assert.match(screen, /DRAFT_NOTICE/);
  assert.match(screen, /FOR HEALTHTIMES LEGAL REVIEW/);
  assert.match(screen, /accessibilityRole="header"/);
  // PolicyLinks lives in Layout so strict-import P0 harnesses (account-access, _layout) stay unchanged.
  const layout = read("src/ui/Layout.tsx");
  assert.match(layout, /export function PolicyLinks/);
  assert.match(layout, /accessibilityRole="link"/);
});

test("policy links are reachable from About and from sign-in/registration", () => {
  assert.match(read("app/about.tsx"), /<PolicyLinks \/>/);
  assert.match(read("app/account-access.tsx"), /<PolicyLinks \/>/);
  const layout = read("app/_layout.tsx");
  for (const name of ["privacy", "terms", "subscription-terms"]) assert.match(layout, new RegExp('<Stack.Screen name="' + name + '" />'));
});

test("each stated fact is anchored to the implementation it describes", () => {
  // Analytics: shape-checked, never transmitted.
  assert.match(read("src/services/fixtures.ts"), /intentionally emits no production analytics/);
  // Sessions: secure storage on native, browser storage on web.
  const authStorage = read("src/security/auth-storage.ts");
  assert.match(authStorage, /SecureStore\.getItemAsync/);
  assert.match(authStorage, /Platform\.OS === "web"[\s\S]*AsyncStorage/);
  // Saved stories and reading positions live in device storage.
  assert.match(read("src/services/reader-persistence.ts"), /AsyncStorage\.setItem/);
  // Push token only after a permission check.
  const push = read("src/security/push.ts");
  assert.ok(push.indexOf("getPermissionsAsync") < push.indexOf("getExpoPushTokenAsync"));
  // Payments switched off; USD plan with no price; browser return never grants access.
  const commerce = readFileSync(join(repo, "lib/ag05-premium-commerce.js"), "utf8");
  assert.match(commerce, /const checkoutImplementationReady = false;/);
  assert.match(commerce, /plan_key: 'healthtimes_premium_monthly'/);
  assert.match(commerce, /currency: 'USD'/);
  // No third-party ad or analytics SDK in the app dependencies.
  const pkg = JSON.parse(read("package.json"));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  for (const sdk of ["react-native-google-mobile-ads", "expo-ads-admob", "@react-native-firebase/analytics", "expo-firebase-analytics", "@segment/analytics-react-native", "@sentry/react-native"]) {
    assert.ok(!deps.includes(sdk), sdk + " would invalidate the draft privacy facts");
  }
  // Refunds: no refund API exists yet.
  assert.ok(!/action === ['"]refund/.test(readFileSync(join(repo, "api/commerce.js"), "utf8")));
  assert.ok(existsSync(join(root, "app/payment/return.tsx")));
});
