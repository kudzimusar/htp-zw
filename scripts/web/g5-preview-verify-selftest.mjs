#!/usr/bin/env node
// HT-MVP-PUBLIC-LAUNCH-01-G3G5: self-test of scripts/web/g5-preview-verify.mjs against the
// compiled-route replica (scripts/web/g5-edge-lab.mjs --serve), including its failure
// classification. Loopback only: no token, no protection, no real backend.
//
//   normal        every check passes; nothing is BLOCKED_STAGING_402
//   staging-402   the mock backend answers HTTP 402 (the staging cached-egress restriction):
//                 exactly the checks that need the CP5 backend are BLOCKED_STAGING_402, none FAIL
//   unconfigured  the page function has no backend configuration: those same checks FAIL and
//                 none is reported as BLOCKED_STAGING_402
//
// Requires a web build (npm run build:phase4:web).
//   node scripts/web/g5-preview-verify-selftest.mjs --out <dir>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const outIndex = process.argv.indexOf('--out');
const outDir = path.resolve(outIndex > 0 ? process.argv[outIndex + 1] : 'g5-preview-verify-selftest');
const BACKEND_CHECKS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'E2', 'E3'];
const MODES = [
  { name: 'normal', labArgs: [], expect: { exit: 0, blocked: [], failed: [] } },
  { name: 'staging-402', labArgs: ['--upstream-status', '402'], expect: { exit: 0, blocked: BACKEND_CHECKS, failed: [] } },
  { name: 'unconfigured', labArgs: ['--unconfigured'], expect: { exit: 1, blocked: [], failed: BACKEND_CHECKS } }
];

function startReplica(labArgs) {
  const child = spawn(process.execPath, ['scripts/web/g5-edge-lab.mjs', '--serve', ...labArgs], { stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((resolve, reject) => {
    const lines = readline.createInterface({ input: child.stdout });
    lines.once('line', line => resolve({ child, base: JSON.parse(line).replica }));
    child.once('exit', code => reject(new Error('replica exited before serving (' + code + ')')));
  });
}

function runVerify(base, out) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['scripts/web/g5-preview-verify.mjs', '--local-replica', base,
      '--preserved', '/cholera-response-update/', '--alias', '/2026/10/30/cholera-response-update/',
      '--upload', '/wp-content/uploads/2026/09/example.jpg', '--out', out], { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', chunk => { log += chunk; });
    child.stderr.on('data', chunk => { log += chunk; });
    child.on('exit', code => resolve({ code, log }));
  });
}

const ids = (evidence, result) => [...new Set(evidence.checks.filter(c => c.result === result).map(c => c.name.split(' ')[0]))].sort();
const same = (a, b) => [...a].sort().join() === [...b].sort().join();

const report = {};
let ok = true;
for (const mode of MODES) {
  const { child, base } = await startReplica(mode.labArgs);
  try {
    const out = path.join(outDir, mode.name);
    const { code, log } = await runVerify(base, out);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'verify.log'), log);
    const evidence = JSON.parse(fs.readFileSync(path.join(out, 'evidence.json'), 'utf8'));
    const blocked = ids(evidence, 'BLOCKED_STAGING_402');
    const failed = ids(evidence, 'FAIL');
    const pass = code === mode.expect.exit && same(blocked, mode.expect.blocked) && same(failed, mode.expect.failed);
    report[mode.name] = { pass, exit: code, summary: evidence.summary, blocked, failed, upstreamProbe: evidence.upstreamProbe || null };
    ok &&= pass;
  } finally {
    child.kill();
  }
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'selftest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);
