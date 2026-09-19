const fs = require('fs');
const path = require('path');
const { buildManifest } = require('./source-package-manifest');
const { validateDatabaseArtifact } = require('./validate-wordpress-database');
const { validateUploadsArtifact } = require('./validate-wordpress-uploads');
const { validateProvenanceReadiness } = require('./validate-provenance-readiness');
const { fetchLiveInventory, reconcileInventories } = require('./reconcile-source-inventory');

const VALIDATOR_VERSION = '1.0.0';

function walk(root) {
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (/^uploads$/i.test(entry.name)) found.push({ kind: 'uploads_dir', full });
      found.push(...walk(full));
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.sql') || lower.endsWith('.sql.gz')) found.push({ kind: 'database', full });
      if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || lower.endsWith('.zip')) {
        const relative = full.toLowerCase();
        if (/uploads|media/.test(relative)) found.push({ kind: 'uploads_archive', full });
      }
    }
  }
  return found;
}

function discoverArtifacts(root, overrides = {}) {
  const found = walk(root);
  const db = overrides.database ? path.resolve(overrides.database) : found.filter(x => x.kind === 'database').map(x => x.full);
  const uploads = overrides.uploads ? path.resolve(overrides.uploads) : found.filter(x => x.kind === 'uploads_dir' || x.kind === 'uploads_archive').map(x => x.full);
  return {
    database: Array.isArray(db) ? (db.length === 1 ? db[0] : null) : db,
    uploads: Array.isArray(uploads) ? (uploads.length === 1 ? uploads[0] : null) : uploads,
    discovery: {
      database_candidates: Array.isArray(db) ? db.length : 1,
      uploads_candidates: Array.isArray(uploads) ? uploads.length : 1
    }
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') args.root = argv[++i];
    else if (argv[i] === '--database') args.database = argv[++i];
    else if (argv[i] === '--uploads') args.uploads = argv[++i];
    else if (argv[i] === '--live-inventory') args.liveInventory = argv[++i];
    else if (argv[i] === '--live-rest-base') args.liveRestBase = argv[++i];
    else if (argv[i] === '--export-timestamp') args.exportTimestamp = argv[++i];
  }
  if (!args.root) throw new Error('ROOT_REQUIRED');
  return args;
}

function readSanitizedInventory(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function validateSourcePackage(root, options = {}) {
  const manifest = buildManifest(root, {
    repoDir: options.repoDir || process.cwd(),
    generatedAt: options.generatedAt,
    snapshotId: options.snapshotId
  });
  const discovered = discoverArtifacts(root, options);
  const result = {
    validator: 'cp3_source_package',
    validator_version: VALIDATOR_VERSION,
    validation_timestamp: new Date().toISOString(),
    status: 'ARTIFACT_MISSING',
    manifest,
    discovery: discovered.discovery,
    database: null,
    uploads: null,
    provenance: null,
    reconciliation: null,
    hard_gates: []
  };

  if (!discovered.database) result.hard_gates.push({ gate: 'authoritative_database', status: 'ARTIFACT_MISSING' });
  if (!discovered.uploads) result.hard_gates.push({ gate: 'authoritative_uploads', status: 'ARTIFACT_MISSING' });
  if (result.hard_gates.length) return result;

  result.database = await validateDatabaseArtifact(discovered.database, { exportTimestamp: options.exportTimestamp || null });
  result.uploads = validateUploadsArtifact(discovered.uploads);
  if (result.database.validation_status !== 'VALID' || result.uploads.validation_status !== 'VALID') {
    result.status = 'ARTIFACT_INVALID';
    if (result.database.validation_status !== 'VALID') result.hard_gates.push({ gate: 'authoritative_database', status: 'ARTIFACT_INVALID' });
    if (result.uploads.validation_status !== 'VALID') result.hard_gates.push({ gate: 'authoritative_uploads', status: 'ARTIFACT_INVALID' });
    return result;
  }

  result.provenance = validateProvenanceReadiness(result.database);
  let liveInventory;
  try {
    liveInventory = options.liveInventory
      ? readSanitizedInventory(path.resolve(options.liveInventory))
      : await fetchLiveInventory(options.liveRestBase || undefined);
    result.reconciliation = reconcileInventories(liveInventory, result.database);
  } catch {
    result.reconciliation = {
      validator: 'source_inventory_reconciliation',
      status: 'RECONCILIATION_INCOMPLETE',
      errors: [{ code: 'LIVE_INVENTORY_UNAVAILABLE', message: 'Fresh read-only WordPress inventory could not be obtained.' }]
    };
  }

  if (result.provenance.status !== 'PROVENANCE_READY' || result.reconciliation.status !== 'RECONCILED') {
    result.status = 'ARTIFACT_VALID_RECONCILIATION_INCOMPLETE';
    return result;
  }
  result.status = 'SOURCE_VALIDATION_READY';
  return result;
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      const report = await validateSourcePackage(path.resolve(args.root), args);
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (report.status === 'ARTIFACT_MISSING') process.exitCode = 2;
      else if (report.status === 'ARTIFACT_INVALID') process.exitCode = 3;
      else if (report.status === 'ARTIFACT_VALID_RECONCILIATION_INCOMPLETE') process.exitCode = 4;
    } catch {
      process.stdout.write(JSON.stringify({
        validator: 'cp3_source_package',
        validator_version: VALIDATOR_VERSION,
        status: 'ARTIFACT_MISSING',
        hard_gates: [{ gate: 'private_workspace', status: 'ARTIFACT_MISSING' }],
        errors: [{ code: 'VALIDATION_START_FAILED', message: 'Private source workspace is missing, unreadable, or violates outside-Git policy.' }]
      }, null, 2) + '\n');
      process.exitCode = 2;
    }
  })();
}

module.exports = { VALIDATOR_VERSION, discoverArtifacts, validateSourcePackage, walk };
