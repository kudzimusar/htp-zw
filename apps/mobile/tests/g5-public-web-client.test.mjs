// HT-MVP-PUBLIC-LAUNCH-01-G5: Reader side of server-rendered legacy pages.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function load(path) {
  const source = readFileSync(join(root, path), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", output)(module, module.exports, () => { throw new Error("Unexpected require"); });
  return module.exports;
}
const web = load("src/services/public-web.ts");

test("injected capability block: only well-formed story/context/route JSON is accepted", () => {
  assert.equal(web.parseInjectedCapabilityText('{"kind":"story","seo":{}}').kind, "story");
  assert.equal(web.parseInjectedCapabilityText('{"kind":"context"}').kind, "context");
  assert.equal(web.parseInjectedCapabilityText('{"kind":"route"}').kind, "route");
  for (const bad of [null, "", "not json", '{"kind":"script"}', "[]", "1", "x".repeat(2_000_001)]) {
    assert.equal(web.parseInjectedCapabilityText(bad), null, String(bad).slice(0, 20));
  }
});

test("alias redirects only follow same-site paths", () => {
  for (const ok of ["/cholera-response-update/", "/2026/09/22/slug/", "/category/health/"]) {
    assert.equal(web.safeInternalRedirectTarget(ok), ok);
  }
  for (const bad of ["//evil.example/x", "https://evil.example/", "/\\evil.example", "javascript:alert(1)", "/javascript:alert(1)",
    "relative/path", "", null, 42, "/a\u0000b", "/" + "a".repeat(600)]) {
    assert.equal(web.safeInternalRedirectTarget(bad), null, String(bad).slice(0, 30));
  }
});

test("server data block applies only to the address it was rendered for", () => {
  assert.equal(web.injectedCapabilityMatchesPath("/cholera-response-update/", "/cholera-response-update"), true);
  assert.equal(web.injectedCapabilityMatchesPath("/cholera-response-update/", "/cholera-response-update/"), true);
  assert.equal(web.injectedCapabilityMatchesPath("/cholera-response-update/", "/another-story"), false);
  assert.equal(web.injectedCapabilityMatchesPath(null, "/x"), false);
  assert.equal(web.injectedCapabilityMatchesPath("/x/", null), false);
});

test("injectedPublicWebCapability reads the DOM block only for the matching path", () => {
  const block = { textContent: '{"kind":"story","seo":{"title":"T"}}', getAttribute: name => (name === "data-path" ? "/story-a/" : null) };
  const saved = globalThis.document;
  globalThis.document = { getElementById: id => (id === "htp-public-capability" ? block : null) };
  const savedLocation = globalThis.location;
  try {
    assert.equal(web.injectedPublicWebCapability("/story-a").kind, "story");
    assert.equal(web.injectedPublicWebCapability("/story-b"), null, "client navigation to another path must refetch");
    assert.equal(web.injectedPublicWebCapability(), null);
    // In the browser the loaded address is authoritative over the router's pathname form.
    globalThis.location = { pathname: "/story-a/" };
    assert.equal(web.injectedPublicWebCapability("/+not-found").kind, "story");
    globalThis.location = { pathname: "/story-b/" };
    assert.equal(web.injectedPublicWebCapability("/story-a"), null);
  } finally {
    if (saved === undefined) delete globalThis.document; else globalThis.document = saved;
    if (savedLocation === undefined) delete globalThis.location; else globalThis.location = savedLocation;
  }
});

test("article reader renders a supplied story on preserved WordPress addresses without an /article/<id> segment", () => {
  const article = readFileSync(join(root, "app/article/[id].tsx"), "utf8");
  assert.match(article, /const id = resolvedId \|\| initialStory\?\.id \|\| "";/);
  assert.match(article, /initialStory \? Promise\.resolve\(initialStory\) : services\.articles\.getById/);
});

test("fallback screen follows validated alias decisions and keys injected data by pathname", () => {
  const screen = readFileSync(join(root, "app/+not-found.tsx"), "utf8");
  assert.match(screen, /safeInternalRedirectTarget\(capability\.routing\.targetPath\)/);
  assert.match(screen, /router\.replace\(redirectTarget as never\)/);
  assert.match(screen, /useMemo\(\(\) => injectedPublicWebCapability\(pathname\), \[pathname\]\)/);
  const service = readFileSync(join(root, "src/services/public-web.ts"), "utf8");
  assert.match(service, /kind=resolve&redirect=json&path=/);
});
