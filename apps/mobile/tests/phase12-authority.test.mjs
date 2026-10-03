import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const mobileRoot = process.cwd();
const repoRoot = path.resolve(mobileRoot, "../..");

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

  const vercel = JSON.parse(fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8"));
  assert.equal(vercel.outputDirectory, "apps/mobile/dist");

  const rootPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(rootPackage.scripts["test:uat"], "playwright test tests/phase12-canonical-uat.spec.js");

  for (const legacy of ["index.html","article.html","premium.html","app.js","reader.js","v21.js"]) {
    assert.equal(fs.existsSync(path.join(repoRoot, legacy)), true, "legacy provenance missing: " + legacy);
  }
});

test("Newsroom remains a distinct protected operational surface", () => {
  for (const relative of ["newsroom.html","newsroom.js","newsroom.css","api/newsroom.js"]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, "missing protected Newsroom surface: " + relative);
  }
  const prepare = fs.readFileSync(path.join(repoRoot, "scripts/web/prepare-phase4-vercel.js"), "utf8");
  assert.match(prepare, /newsroom\.html/);
  assert.match(prepare, /newsroom\.js/);
  assert.match(prepare, /newsroom\.css/);
});
