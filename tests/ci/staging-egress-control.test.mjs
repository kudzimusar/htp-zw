// CI staging egress control contract (docs/cost-recovery/CI_STAGING_EGRESS_CONTROL.md).
//
// HealthTimes staging runs on Supabase Free. Every CI job that renders the Reader
// in a browser or emulator must take public archive media from the verified
// Cloudflare mirror, keep live staging checks mandatory, and cancel superseded
// runs. This test reads the workflow files as text, parses jobs and steps by their
// indentation (2 and 6 spaces), and fails closed on anything it cannot classify.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const workflowsDir = path.join(root, ".github/workflows");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const MIRROR_ORIGIN = "https://healthtimes-media.pages.dev";

// Jobs that render the Reader in CI and must enable the mirror before building.
const MIRRORED_JOBS = {
  "ag05-nm07-phase7-premium-hospaz.yml": ["convergence"],
  "nm07-phase6-migrated-corpus.yml": ["reader-convergence"],
  "phase10-visual-conformance.yml": ["candidate-web", "candidate-ios", "candidate-android"],
  "phase10-visual-evidence.yml": ["final-web"],
  "uat.yml": ["playwright"],
  "ui-wf01b-r2-owner-home-evidence.yml": ["owner-checkpoint-home"],
  "ui01-phase3-discovery.yml": ["discovery-web"],
  "ui01-phase4-media.yml": ["media-web"],
  "ui02-phase6a-native-cross-device.yml": ["ios-evidence", "android-evidence"],
  "ui03-commercial-reader-conformance.yml": ["web-evidence"],
  "ui04-edition-full-reload-diagnostic.yml": ["diagnose-edition-reload"],
  "ui04-phase5-reader-ownership.yml": ["reader-ownership-web"],
  "ui05-phase6b-accessibility-states-responsive.yml": ["phase6b-quality"],
  "ui06-phase6c-final-cross-device-certification.yml": ["final-web-client-uat"]
};

// Jobs that look like Reader rendering but are deliberately outside this control.
const EXCLUDED_JOBS = {
  "ht-mvp-owner-uat-p0-browser-endurance.yml#isolated-reader-endurance":
    "P0 endurance gate owns its own branch-scoped mirror step; the accepted P0 branch stays on its certified configuration",
  "native-reader-product.yml#reader-product":
    "Playwright spec is node-level (no page fixture); the exported bundle is never rendered",
  "ui-wf01b-r2-p2-owner-android-apk.yml#owner-native-android-apk":
    "Builds a frozen product SHA on dispatch or one legacy branch; not triggered by pull requests",
  "ui-wf02a-search-native-visual.yml#ios-search-native":
    "Runs only for the legacy feat/ui-wf01a-compact-reader-shell base or its own branch",
  "ui-wf02a-search-native-visual.yml#android-search-native":
    "Runs only for the legacy feat/ui-wf01a-compact-reader-shell base or its own branch"
};

const BUILD = /npm run build:phase4:web|run export:web|npm run native:export:web|expo prebuild|assembleRelease|assembleDebug|xcodebuild(?!\s+-(?:version|list))|expo start/;
const WEB_BUILD = /npm run build:phase4:web|run export:web|npm run native:export:web/;
const RENDER = /npx playwright install|playwright test|maestro|android-emulator-runner|simctl boot|ui-rel04-current-static-server/;
// Mobile unit suites are always invoked through `npm --prefix apps/mobile run test:*`; root
// `npm run test:uat` is the Playwright browser UAT and is meant to run against the mirrored build.
const UNIT_TEST = /node --test|npm --prefix apps\/mobile run test:|run typecheck/;
const ENABLE = "bash scripts/ci/public-media-mirror.sh enable";
const VERIFY = "bash scripts/ci/public-media-mirror.sh verify";

function parseWorkflow(file) {
  const text = fs.readFileSync(path.join(workflowsDir, file), "utf8");
  const lines = text.split("\n");
  const jobsAt = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  assert.ok(jobsAt >= 0, `${file}: no jobs block`);
  const jobs = {};
  let current = null;
  for (let i = jobsAt + 1; i < lines.length; i += 1) {
    const header = /^  ([A-Za-z0-9_-]+):\s*$/.exec(lines[i]);
    if (header) { current = header[1]; jobs[current] = []; continue; }
    if (/^\S/.test(lines[i])) break;
    if (current) jobs[current].push(lines[i]);
  }
  const parsed = {};
  for (const [job, body] of Object.entries(jobs)) {
    const stepsAt = body.findIndex((line) => /^    steps:\s*$/.test(line));
    const steps = [];
    if (stepsAt >= 0) {
      for (let i = stepsAt + 1; i < body.length; i += 1) {
        const line = body[i];
        if (line.trim() && !/^      /.test(line) && !/^      - /.test(line)) break;
        if (/^      - /.test(line)) steps.push(line + "\n");
        else if (steps.length) steps[steps.length - 1] += line + "\n";
      }
    }
    parsed[job] = { text: body.join("\n"), steps };
  }
  return { text, jobs: parsed };
}

const workflowFiles = fs.readdirSync(workflowsDir).filter((file) => file.endsWith(".yml")).sort();
const workflows = Object.fromEntries(workflowFiles.map((file) => [file, parseWorkflow(file)]));

test("every CI job that builds and renders the Reader is mirrored or explicitly excluded", () => {
  const rendering = [];
  for (const [file, workflow] of Object.entries(workflows)) {
    for (const [job, { steps }] of Object.entries(workflow.jobs)) {
      const all = steps.join("");
      if (BUILD.test(all) && RENDER.test(all)) rendering.push(`${file}#${job}`);
    }
  }
  const mirrored = Object.entries(MIRRORED_JOBS).flatMap(([file, jobs]) => jobs.map((job) => `${file}#${job}`));
  const unclassified = rendering.filter((key) => !mirrored.includes(key) && !(key in EXCLUDED_JOBS));
  assert.deepEqual(unclassified, [], "Reader-rendering CI jobs must enable the Cloudflare mirror or be listed with a reason");
  for (const key of [...mirrored, ...Object.keys(EXCLUDED_JOBS)]) {
    const [file, job] = key.split("#");
    assert.ok(workflows[file]?.jobs[job], `${key} is listed but does not exist`);
  }
  for (const key of mirrored) assert.ok(rendering.includes(key), `${key} is listed as mirrored but no longer renders the Reader`);
});

test("mirrored jobs enable the mirror after unit tests and before every build", () => {
  for (const [file, jobs] of Object.entries(MIRRORED_JOBS)) {
    for (const job of jobs) {
      const { steps } = workflows[file].jobs[job];
      const enableAt = steps.map((step, index) => (step.includes(ENABLE) ? index : -1)).filter((index) => index >= 0);
      assert.equal(enableAt.length, 1, `${file}#${job}: exactly one enable step`);
      const [at] = enableAt;
      steps.slice(0, at).forEach((step) => {
        assert.equal(BUILD.test(step), false, `${file}#${job}: build or Metro step before the mirror is enabled:\n${step}`);
      });
      steps.slice(at + 1).forEach((step) => {
        assert.equal(UNIT_TEST.test(step), false, `${file}#${job}: unit tests after the enable step would lose their default media configuration:\n${step}`);
      });
      assert.ok(steps.slice(at + 1).some((step) => BUILD.test(step)), `${file}#${job}: no build after the enable step`);
    }
  }
});

test("every mirrored web build is immediately verified to contain the mirror origin", () => {
  for (const [file, jobs] of Object.entries(MIRRORED_JOBS)) {
    for (const job of jobs) {
      const { steps } = workflows[file].jobs[job];
      steps.forEach((step, index) => {
        if (!WEB_BUILD.test(step) || step.includes("/tmp/htp-zw-ui-wf01b-main")) return;
        assert.ok(steps[index + 1]?.includes(VERIFY), `${file}#${job}: web build must be followed by the verify step:\n${step}`);
      });
    }
  }
});

test("staging-browser workflows cancel superseded runs by ref instead of keeping one run per SHA", () => {
  for (const file of Object.keys(MIRRORED_JOBS)) {
    const { text } = workflows[file];
    const match = /^concurrency:\n  group: (.+)\n  cancel-in-progress: (true|false)\s*$/m.exec(text);
    assert.ok(match, `${file}: workflow-level concurrency block`);
    assert.equal(match[2], "true", `${file}: cancel-in-progress`);
    assert.match(match[1], /\$\{\{ github\.(ref|event\.pull_request\.head\.ref \|\| github\.ref) \}\}$/, `${file}: group keyed by ref`);
    assert.doesNotMatch(match[1], /sha/, `${file}: group must not be keyed by commit SHA`);
  }
});

test("live staging checks stay mandatory and are not converted into passes", () => {
  const required = [
    ["native-certification.yml", "readiness", "npm --prefix apps/mobile run test:staging"],
    ["ui03-commercial-reader-conformance.yml", "web-evidence", "npm --prefix apps/mobile run test:nm05-premium-live"],
    ["ui03-commercial-reader-conformance.yml", "web-evidence", "EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: staging"],
    ["phase10-visual-conformance.yml", "candidate-web", "EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: staging"],
    ["ag05-nm07-phase7-premium-hospaz.yml", "readonly-staging", "node scripts/ui/ui-rel04-cp5-readonly-check.cjs"],
    ["nm07-phase6-migrated-corpus.yml", "readonly-staging", "node scripts/ui/ui-rel04-cp5-readonly-check.cjs"],
    ["uat.yml", "playwright", "npm run test:uat"],
    ["ui06-phase6c-final-cross-device-certification.yml", "final-web-client-uat", "node scripts/ui/ui06-phase6c-final-cert.mjs"]
  ];
  for (const [file, job, marker] of required) {
    const body = workflows[file].jobs[job]?.text ?? "";
    assert.ok(body.includes(marker), `${file}#${job} must keep live staging check: ${marker}`);
  }
  for (const [file, jobs] of Object.entries(MIRRORED_JOBS)) {
    for (const job of jobs) {
      for (const step of workflows[file].jobs[job].steps) {
        assert.doesNotMatch(step, /continue-on-error:\s*true/, `${file}#${job}: mirrored jobs must not soften failures`);
        assert.doesNotMatch(step, /if:\s*.*(staging|402)/i, `${file}#${job}: no step may be skipped on staging availability`);
      }
    }
  }
  // The live media integrity check still targets Supabase directly, with HEAD only.
  const integrity = read("apps/mobile/tests/source-parity-media-integrity.test.mjs");
  assert.ok(integrity.includes('fetch(entry.expectedMirrorPath, { method: "HEAD" })'));
});

test("the mirror script has one origin, fails closed and never falls back to Supabase", () => {
  const script = read("scripts/ci/public-media-mirror.sh");
  assert.ok(script.includes(`ORIGIN="${MIRROR_ORIGIN}"`));
  assert.ok(script.includes("set -euo pipefail"));
  assert.ok(script.includes("PUBLIC_MEDIA_MIRROR_UNREACHABLE"));
  assert.ok(script.includes("MEDIA_ORIGIN_NOT_COMPILED"));
  assert.doesNotMatch(script.replace(/^#.*$/gm, ""), /supabase/i, "the script must not reference Supabase outside comments");
  const endurance = read(".github/workflows/ht-mvp-owner-uat-p0-browser-endurance.yml");
  assert.ok(endurance.includes(`EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL=${MIRROR_ORIGIN}`), "endurance gate and CI egress control use the same origin");
});

test("the Reader maps only public archive and allowlisted newsroom media to the mirror", () => {
  const resolver = read("apps/mobile/src/services/public-media-origin.ts");
  const prefixes = [...resolver.matchAll(/\/storage\/v1\/object\/[^'"]*/g)].map((match) => match[0]);
  assert.deepEqual([...new Set(prefixes)].sort(), [
    "/storage/v1/object/public/migrated-media/",
    "/storage/v1/object/public/newsroom-public/"
  ]);
  assert.match(resolver, /if \(!mirroredNewsroomKeys\.has\(key\)\) return value;/);
  assert.doesNotMatch(resolver, /newsroom-private|communications-private|\/object\/sign\//);
});

test("UI-03 evidence redirects verified WordPress media to the same object the job selected", () => {
  const evidence = read("apps/mobile/tests/ui03-commercial-reader-evidence.mjs");
  assert.ok(evidence.includes("headers: { Location: verifiedMediaTarget(verified)"));
  assert.ok(evidence.includes('if(!configured || !supabaseUrl.startsWith(MIGRATED_MEDIA_PREFIX)) return supabaseUrl;'));
});

test("the sealed G3 artifact of a launch candidate compiles the mirror; the P0 artifact keeps its configuration", () => {
  const { steps } = workflows["ht-mvp-uiat01-r3-icr05b-certification.yml"].jobs["g3-isolated-artifact-certification"];
  const launchOnly = "if: steps.check-scope.outputs.is_g3 == 'true' && startsWith(github.head_ref || github.ref_name, 'fix/ht-mvp-owner-uat-p0-launch-')";
  const enableAt = steps.findIndex((step) => step.includes(ENABLE));
  const buildAt = steps.findIndex((step) => step.includes("npx vercel build"));
  const verifyAt = steps.findIndex((step) => step.includes(`${VERIFY} .vercel/output/static`));
  const manifestAt = steps.findIndex((step) => step.includes("verify-vercel-manifest.mjs --verify"));
  assert.ok(enableAt >= 0 && buildAt > enableAt, "enable before the Vercel build");
  assert.ok(verifyAt > buildAt && verifyAt < manifestAt, "verify the packaged output before manifest certification");
  for (const index of [enableAt, verifyAt]) assert.ok(steps[index].includes(launchOnly), "mirror steps are limited to launch candidates");
  assert.equal(steps.filter((step) => step.includes("public-media-mirror.sh")).length, 2);
  const payload = steps.find((step) => step.includes("g3-artifact-certification.json"));
  assert.ok(payload.includes('compiledPublicMediaOrigin: compilesMirror(".vercel/output/static/_expo") ? "https://healthtimes-media.pages.dev" : "supabase-default"'));
});
