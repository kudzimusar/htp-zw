// HT-MVP-PUBLIC-LAUNCH-01-G5: client error capture is off by default and never leaks personal data.
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

test("scrubbing removes emails, tokens, identifiers, numbers and query strings", () => {
  const { scrubText } = load("src/monitoring/client-errors.ts");
  const raw = "Failed for reader@example.org token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def at " +
    "https://healthtimes.co.zw/account-access?mode=recovery&code=SECRETCODE#access_token=xyz user 3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab " +
    "phone +263 77 123 4567 key sb_publishable_abcdefghij Bearer abc.def.ghi blob QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo0NTY3ODkw";
  const clean = scrubText(raw);
  for (const leak of ["reader@example.org", "eyJhbGci", "SECRETCODE", "access_token", "3f2b8c1e", "77 123 4567", "sb_publishable_abc", "Bearer abc", "QUJDREVG"]) {
    assert.ok(!clean.includes(leak), "leaked " + leak + " in " + clean);
  }
  assert.match(clean, /https:\/\/healthtimes\.co\.zw\/account-access/);
  assert.ok(scrubText("x".repeat(2000)).length <= 300);
});

test("reports keep only the path, a short scrubbed stack and the release", () => {
  const { buildReport } = load("src/monitoring/client-errors.ts");
  const error = new Error("boom for a@b.co");
  error.stack = "Error: boom\n    at f (https://healthtimes.co.zw/_expo/static/js/web/entry.js?v=1:1:2)\n" + "    at g (x)\n".repeat(20);
  const report = buildReport({ kind: "error", error, path: "/article/abc?ref=a@b.co#x", release: "d61bd97", now: new Date("2026-11-14T00:00:00Z") });
  assert.equal(report.message, "boom for [email]");
  assert.equal(report.path, "/article/abc");
  assert.equal(report.stack.split("\n").length, 8);
  assert.doesNotMatch(report.stack, /\?v=1/);
  assert.equal(report.at, "2026-11-14T00:00:00.000Z");
  assert.equal(buildReport({ kind: "unhandledrejection", error: "plain reason", path: "/", release: "r" }).message, "plain reason");
});

test("reporter is sampled, de-duplicated, capped per session and inert without an endpoint", () => {
  const { createReporter, buildReport } = load("src/monitoring/client-errors.ts");
  const entry = n => buildReport({ kind: "error", error: new Error("e" + n), path: "/", release: "r" });
  const sent = [];
  const off = createReporter({ endpoint: null, send: () => { sent.push(1); return true; } });
  assert.equal(off(entry(1)), false);
  assert.equal(sent.length, 0);
  const on = createReporter({ endpoint: "/collect", sampleRate: 1, maxPerSession: 3, random: () => 0, send: (url, body) => { sent.push(JSON.parse(body)); return true; } });
  assert.equal(on(entry(1)), true);
  assert.equal(on(entry(1)), false, "duplicate");
  on(entry(2)); on(entry(3)); on(entry(4));
  assert.equal(sent.length, 3, "session cap");
  const sampledOut = createReporter({ endpoint: "/collect", sampleRate: 0.25, random: () => 0.9, send: () => { throw new Error("must not send"); } });
  assert.equal(sampledOut(entry(9)), false);
  const throwing = createReporter({ endpoint: "/collect", sampleRate: 1, random: () => 0, send: () => { throw new Error("transport"); } });
  assert.equal(throwing(entry(10)), false, "transport failure never throws into the app");
});

test("installation is web-only, needs a valid endpoint and installs nothing by default", () => {
  const listeners = [];
  const target = { addEventListener: (type) => listeners.push(type), location: { pathname: "/" } };
  const saved = process.env.EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT;
  delete process.env.EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT;
  try {
    let mod = load("src/monitoring/client-errors.ts");
    assert.equal(mod.installClientErrorReporting({ platform: "web", target }), false, "default build");
    assert.equal(mod.installClientErrorReporting({ platform: "ios", target, endpoint: "/collect" }), false);
    for (const bad of ["http://collector.example/x", "//evil.example/x", "javascript:alert(1)", "https://user:pw@collector.example/"]) {
      assert.equal(mod.installClientErrorReporting({ platform: "web", target, endpoint: bad }), false, bad);
    }
    assert.equal(listeners.length, 0);
    mod = load("src/monitoring/client-errors.ts");
    assert.equal(mod.installClientErrorReporting({ platform: "web", target, endpoint: "/api/client-errors" }), true);
    assert.deepEqual(listeners, ["error", "unhandledrejection"]);
    assert.equal(mod.installClientErrorReporting({ platform: "web", target, endpoint: "/api/client-errors" }), false, "installs once");
  } finally {
    if (saved !== undefined) process.env.EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT = saved;
  }
});

test("capture never listens to window message events (P0 crash class)", () => {
  const source = read("src/monitoring/client-errors.ts");
  assert.doesNotMatch(source, /addEventListener\("message"/);
  assert.match(read("src/ui/Layout.tsx"), /<RouteSeoHead \/>\s*<ClientErrorReporting \/>/);
  assert.match(read("src/ui/Studio.tsx"), /<RouteSeoHead \/>\s*<ClientErrorReporting \/>/);
});
