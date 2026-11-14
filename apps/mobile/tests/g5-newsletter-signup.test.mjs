// HT-MVP-PUBLIC-LAUNCH-01-G5: public newsletter sign-up is excluded from launch until enabled and approved.
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
const signup = load("src/growth/newsletter-signup.ts");
const approved = { status: "approved", version: "2026-12-01" };
const draft = { status: "draft-pending-legal-review", version: "draft-2026-11-14" };

test("the form is offered only with the build flag AND an approved privacy policy", () => {
  const saved = process.env.EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP;
  delete process.env.EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP;
  try {
    assert.equal(signup.newsletterSignupAvailable({ privacyPolicy: approved }), false, "default build");
  } finally {
    if (saved !== undefined) process.env.EXPO_PUBLIC_HEALTHTIMES_NEWSLETTER_SIGNUP = saved;
  }
  assert.equal(signup.newsletterSignupAvailable({ flag: "true", privacyPolicy: draft }), false, "never against a draft policy");
  assert.equal(signup.newsletterSignupAvailable({ flag: "true", privacyPolicy: { status: "approved", version: "draft-x" } }), false);
  assert.equal(signup.newsletterSignupAvailable({ flag: "1", privacyPolicy: approved }), false);
  assert.equal(signup.newsletterSignupAvailable({ flag: "true", privacyPolicy: approved }), true);
});

test("requests carry explicit consent and the approved policy version; invalid input never reaches the server", () => {
  const ok = signup.buildSignupRequest({ email: " Reader@Example.org ", consent: true, policyVersion: "2026-12-01" });
  assert.equal(ok.ok, true);
  assert.equal(ok.request.url, "/api/communications?action=signup");
  assert.equal(ok.request.init.method, "POST");
  assert.equal(ok.request.init.credentials, "same-origin");
  assert.deepEqual(JSON.parse(ok.request.init.body), { email: "reader@example.org", purpose: "NEWSLETTER", consent: true, policyVersion: "2026-12-01", source: "healthtimes-web-reader" });
  for (const bad of [
    { email: "not-an-email", consent: true, policyVersion: "2026-12-01" },
    { email: "a@b.co", consent: false, policyVersion: "2026-12-01" },
    { email: "a@b.co", consent: true, policyVersion: "draft-2026-11-14" },
    { email: "a@b.co", consent: true, policyVersion: "" }
  ]) assert.equal(signup.buildSignupRequest(bad).ok, false, JSON.stringify(bad));
  assert.match(signup.signupResultMessage(200), /subscribed/);
  assert.match(signup.signupResultMessage(503), /unavailable/);
});

test("default launch renders no newsletter form; About hosts it when enabled", () => {
  const layout = read("src/ui/Layout.tsx");
  assert.match(layout, /if \(Platform\.OS !== "web" \|\| !privacy \|\| !newsletterSignupAvailable\(\{ privacyPolicy: privacy \}\)\) return null;/);
  assert.match(layout, /accessibilityLabel=\{NEWSLETTER_CONSENT_LABEL\}/);
  assert.match(read("app/about.tsx"), /<NewsletterSignup \/>/);
});
