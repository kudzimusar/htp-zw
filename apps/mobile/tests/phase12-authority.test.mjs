import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const mobileRoot = process.cwd();
const repoRoot = path.resolve(mobileRoot, "../..");
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("Phase 12 keeps apps/mobile as the universal Reader source", () => {
  for (const relative of [
    "app/(reader)/index.tsx",
    "app/(reader)/explore.tsx",
    "app/(reader)/live.tsx",
    "app/(reader)/watch.tsx",
    "app/(reader)/my.tsx",
    "app/search.tsx",
    "app/premium.tsx",
    "app/article/[id].tsx",
    "public/manifest.json",
    "public/sw.js"
  ]) {
    assert.equal(fs.existsSync(path.join(mobileRoot, relative)), true, "missing canonical Reader surface: " + relative);
  }

  const pages = readRepo(".github/workflows/pages.yml");
  assert.match(pages, /path: apps\/mobile\/dist/);
  assert.match(pages, /LEGACY \/ SUPERSEDED \/ NON-SERVING EVIDENCE/);
  assert.match(pages, /Pages publication input is apps\/mobile\/dist only/);

  const uat = readRepo(".github/workflows/uat.yml");
  assert.match(uat, /"presentation":"apps\/mobile"/);
  assert.match(uat, /Legacy root app\.js leaked into canonical output/);
  assert.match(uat, /Legacy root v21\.js leaked into canonical output/);

  const rootPackage = JSON.parse(readRepo("package.json"));
  assert.equal(rootPackage.scripts["test:uat"], "playwright test tests/phase12-canonical-uat.spec.js");

  for (const legacy of ["index.html","article.html","premium.html","app.js","reader.js","v21.js"]) {
    assert.equal(fs.existsSync(path.join(repoRoot, legacy)), true, "legacy provenance missing: " + legacy);
  }
});

test("Newsroom remains distinct from the canonical Reader publication source", () => {
  for (const relative of ["newsroom.html","newsroom.js","newsroom.css"]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, "missing retained Newsroom surface: " + relative);
    assert.equal(fs.existsSync(path.join(mobileRoot, "public", relative)), false, "Newsroom must not become canonical Reader public authority: " + relative);
  }

  const pages = readRepo(".github/workflows/pages.yml");
  assert.match(pages, /Pages publication input is apps\/mobile\/dist only/);
});
