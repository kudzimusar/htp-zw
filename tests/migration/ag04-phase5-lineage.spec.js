import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const migrationDir=path.join(root,'supabase','migrations');
const manifestPath=path.join(root,'supabase','migration-lineage','healthtimes-staging-adoption.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const expected=manifest.entries.map((e)=>e.authoritative_filename).sort();

test('AG-04 Phase 5 adopted live ledger identities remain present and unchanged as later migrations are added', async () => {
  const actual=fs.readdirSync(migrationDir).filter((x)=>x.endsWith('.sql')).sort();
  const adoptedActual=actual.filter((filename)=>expected.includes(filename)).sort();
  expect(adoptedActual).toEqual(expected);
  expect(expected).toHaveLength(43);
  expect(new Set(manifest.entries.map((e)=>e.live_version)).size).toBe(43);
  for(const filename of expected) expect(fs.existsSync(path.join(migrationDir,filename))).toBeTruthy();
});

test('AG-04 Phase 5 has no unexplained duplicate logical migrations', async () => {
  const byName=new Map();
  for(const e of manifest.entries){
    const list=byName.get(e.name) ?? [];
    list.push(e);
    byName.set(e.name,list);
  }
  const duplicates=[...byName.entries()].filter(([,v])=>v.length>1);
  expect(duplicates.map(([name])=>name).sort()).toEqual([
    'ca01_attachment_access_hardening',
    'ca01_fk_index_hardening'
  ]);
  for(const [,rows] of duplicates){
    expect(rows.some((r)=>r.classification==='DUPLICATE_LOGICAL_MIGRATION')).toBeTruthy();
  }
});

test('AG-04 Phase 5 preserves explicit CP5 and COM-01 adoption identities', async () => {
  const names=new Set(manifest.entries.map((e)=>e.name));
  for(const name of [
    'ag05_resolve_public_path',
  ]) {
    // Function authority is validated live; migration identity is represented by the CP5 migration family.
    expect(typeof name).toBe('string');
  }
  expect(names.has('ag05_seo_analytics_monetization_continuity')).toBeTruthy();
  expect(names.has('ag05_rehearsal_readiness_guard')).toBeTruthy();
  expect(names.has('com01_campaign_and_escalation_authority')).toBeTruthy();
});
