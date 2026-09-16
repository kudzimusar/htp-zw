#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { normalizeWpMedia, normalizeWpPost, stableHash } = require('./wordpress-transform');

function parseArgs(argv) {
  const args = { mode: 'rest', site: 'https://healthtimes.co.zw', dryRun: true, perPage: 50, limit: 0, rateLimitMs: 500, outDir: 'migration-output' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--execute') args.dryRun = false;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = ['perPage', 'limit', 'rateLimitMs'].includes(key) ? Number(next) : next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const total = response.headers.get('x-wp-total');
      const totalPages = response.headers.get('x-wp-totalpages');
      return { data: await response.json(), total: Number(total || 0), totalPages: Number(totalPages || 0) };
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function restInventory(args) {
  const entities = ['posts', 'pages', 'media', 'categories', 'tags', 'users'];
  const inventory = { generatedAt: new Date().toISOString(), site: args.site, mode: 'rest', totals: {}, samples: {} };
  for (const entity of entities) {
    const url = `${args.site.replace(/\/$/, '')}/wp-json/wp/v2/${entity}?per_page=1`;
    const result = await fetchJson(url);
    inventory.totals[entity] = result.total;
    inventory.samples[entity] = result.data;
    await sleep(args.rateLimitMs);
  }
  return inventory;
}

async function restExtract(args) {
  const out = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    source: args.site,
    records: [],
    media: [],
    redirects: [],
    exceptions: []
  };
  const postTypes = [
    { route: 'posts', normalizer: normalizeWpPost },
    { route: 'pages', normalizer: normalizeWpPost },
    { route: 'media', normalizer: normalizeWpMedia }
  ];
  for (const type of postTypes) {
    let page = 1;
    let imported = 0;
    while (true) {
      const url = `${args.site.replace(/\/$/, '')}/wp-json/wp/v2/${type.route}?per_page=${args.perPage}&page=${page}&_embed=1`;
      const result = await fetchJson(url);
      const list = Array.isArray(result.data) ? result.data : [];
      if (!list.length) break;
      for (const item of list) {
        const normalized = type.normalizer(item, { siteUrl: args.site });
        if (type.route === 'media') out.media.push(normalized);
        else {
          out.records.push(normalized);
          if (normalized.source.sourceUrl && normalized.source.legacyPath) {
            out.redirects.push({
              sourcePath: normalized.source.legacyPath,
              targetPath: normalized.source.legacyPath,
              status: 'preserve',
              sourceStableKey: normalized.source.stableKey
            });
          }
        }
        out.exceptions.push(...normalized.exceptions.map(exception => ({ ...exception, source: normalized.source })));
        imported += 1;
        if (args.limit && imported >= args.limit) break;
      }
      if (args.limit && imported >= args.limit) break;
      if (page >= result.totalPages) break;
      page += 1;
      await sleep(args.rateLimitMs);
    }
  }
  out.manifest = {
    checksum: stableHash(JSON.stringify({ records: out.records, media: out.media, redirects: out.redirects })),
    counts: { records: out.records.length, media: out.media.length, redirects: out.redirects.length, exceptions: out.exceptions.length }
  };
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  ensureDir(args.outDir);
  if (args.mode === 'rest-inventory') {
    const inventory = await restInventory(args);
    writeJson(path.join(args.outDir, 'wordpress-public-inventory.json'), inventory);
    console.log(JSON.stringify(inventory.totals, null, 2));
    return;
  }
  if (args.mode === 'rest') {
    const extracted = await restExtract(args);
    writeJson(path.join(args.outDir, 'import-manifest.json'), extracted.manifest);
    writeJson(path.join(args.outDir, 'normalized-records.json'), extracted.records);
    writeJson(path.join(args.outDir, 'media-manifest.json'), extracted.media);
    writeJson(path.join(args.outDir, 'redirect-manifest.json'), extracted.redirects);
    writeJson(path.join(args.outDir, 'exceptions-report.json'), extracted.exceptions);
    console.log(JSON.stringify(extracted.manifest.counts, null, 2));
    return;
  }
  if (args.mode === 'wxr' || args.mode === 'database') {
    const note = {
      generatedAt: new Date().toISOString(),
      mode: args.mode,
      status: 'scaffolded',
      requiredInput: args.mode === 'wxr' ? 'WordPress WXR XML export file' : 'Client-supplied SQL/CSV database export',
      nextStep: 'Parse source export into the same normalized records, media manifest, redirect manifest and exceptions report.'
    };
    writeJson(path.join(args.outDir, `${args.mode}-ingestion-plan.json`), note);
    console.log(JSON.stringify(note, null, 2));
    return;
  }
  throw new Error(`Unsupported mode: ${args.mode}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
