const fs = require('fs');
const path = require('path');
const { buildManifest } = require('./source-package-manifest');
const { validateDatabaseArtifact } = require('./validate-wordpress-database');
const { validateUploadsArtifact } = require('./validate-wordpress-uploads');
const { validateProvenanceReadiness } = require('./validate-provenance-readiness');
const { fetchLiveInventory, reconcileInventories } = require('./reconcile-source-inventory');

const VALIDATOR_VERSION = '1.2.0';

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
        if (/uploads|media/i.test(full)) found.push({ kind: 'uploads_archive', full });
      }
    }
  }
  return found;
}

function safeDiscoveryRecord(candidateCount, sourceClass, artifactRole, explicitOverride) {
  let selection_status = 'MISSING';
  if (explicitOverride) selection_status = 'EXPLICIT_OVERRIDE';
  else if (candidateCount === 1) selection_status = 'AUTO_SINGLE';
  else if (candidateCount > 1) selection_status = 'AMBIGUOUS';
  return {
    candidate_count: explicitOverride ? 1 : candidateCount,
    source_class: sourceClass,
    artifact_role: artifactRole,
    selection_status
  };
}

function discoverArtifacts(root, overrides = {}) {
  const found = walk(root);
  const dbCandidates = found.filter(x => x.kind === 'database').map(x => x.full);
  const uploadsCandidates = found.filter(x => x.kind === 'uploads_dir' || x.kind === 'uploads_archive').map(x => x.full);
  const dbExplicit = Boolean(overrides.database);
  const uploadsExplicit = Boolean(overrides.uploads);
  const database = dbExplicit ? path.resolve(overrides.database) : (dbCandidates.length === 1 ? dbCandidates[0] : null);
  const uploads = uploadsExplicit ? path.resolve(overrides.uploads) : (uploadsCandidates.length === 1 ? uploadsCandidates[0] : null);

  return {
    database,
    uploads,
    database_ambiguous: !dbExplicit && dbCandidates.length > 1,
    uploads_ambiguous: !uploadsExplicit && uploadsCandidates.length > 1,
    discovery: {
      database: safeDiscoveryRecord(dbCandidates.length, 'WORDPRESS', 'AUTHORITATIVE_WORDPRESS_DATABASE', dbExplicit),
      uploads: safeDiscoveryRecord(uploadsCandidates.length, 'WORDPRESS', 'AUTHORITATIVE_WORDPRESS_UPLOADS', uploadsExplicit)
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
    else if (argv[i] === '--admin-user-count') args.adminUserCount = Number(argv[++i]);
    else if (argv[i] === '--export-timestamp') args.exportTimestamp = argv[++i];
    else if (argv[i] === '--wordpress-prefix') args.wordpressPrefix = argv[++i];
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
    reconciliation_core_status: null,
    author_count_status: null,
    hard_gates: [],
    review_gates: []
  };

  if (discovered.database_ambiguous || discovered.uploads_ambiguous) {
    result.status = 'ARTIFACT_AMBIGUOUS';
    if (discovered.database_ambiguous) {
      result.hard_gates.push({
        gate: 'authoritative_database',
        status: 'ARTIFACT_AMBIGUOUS',
        candidate_count: discovered.discovery.database.candidate_count,
        source_class: 'WORDPRESS',
        artifact_role: 'AUTHORITATIVE_WORDPRESS_DATABASE'
      });
    }
    if (discovered.uploads_ambiguous) {
      result.hard_gates.push({
        gate: 'authoritative_uploads',
        status: 'ARTIFACT_AMBIGUOUS',
        candidate_count: discovered.discovery.uploads.candidate_count,
        source_class: 'WORDPRESS',
        artifact_role: 'AUTHORITATIVE_WORDPRESS_UPLOADS'
      });
    }
    return result;
  }

  if (!discovered.database) result.hard_gates.push({ gate: 'authoritative_database', status: 'ARTIFACT_MISSING' });
  if (!discovered.uploads) result.hard_gates.push({ gate: 'authoritative_uploads', status: 'ARTIFACT_MISSING' });
  if (result.hard_gates.length) return result;

  result.database = await validateDatabaseArtifact(discovered.database, {
    exportTimestamp: options.exportTimestamp || null,
    wordpressPrefix: options.wordpressPrefix
  });
  result.uploads = validateUploadsArtifact(discovered.uploads);

  if (result.database.validation_status !== 'VALID' || result.uploads.validation_status === 'INVALID') {
    result.status = 'ARTIFACT_INVALID';
    if (result.database.validation_status !== 'VALID') result.hard_gates.push({ gate: 'authoritative_database', status: 'ARTIFACT_INVALID' });
    if (result.uploads.validation_status === 'INVALID') result.hard_gates.push({ gate: 'authoritative_uploads', status: 'ARTIFACT_INVALID' });
    return result;
  }

  if (result.uploads.validation_status === 'VALID_REQUIRES_REVIEW') {
    result.review_gates.push({
      gate: 'authoritative_uploads',
      status: 'VALID_REQUIRES_REVIEW',
      finding_codes: result.uploads.security_findings.map(f => f.code)
    });
  }

  result.provenance = validateProvenanceReadiness(result.database);

  let liveInventory;
  try {
    liveInventory = options.liveInventory
      ? readSanitizedInventory(path.resolve(options.liveInventory))
      : await fetchLiveInventory(options.liveRestBase || undefined, { adminUserCount: options.adminUserCount });
    result.reconciliation = reconcileInventories(liveInventory, result.database);
  } catch {
    result.reconciliation = {
      validator: 'source_inventory_reconciliation',
      status: 'RECONCILIATION_INCOMPLETE',
      core_content_status: 'CORE_CONTENT_REQUIRES_REVIEW',
      author_count_status: 'AUTHOR_COUNT_REQUIRES_PRIVATE_OR_ADMIN_EVIDENCE',
      errors: [{ code: 'LIVE_INVENTORY_UNAVAILABLE', message: 'Fresh read-only WordPress core inventory could not be obtained.' }]
    };
  }

  result.reconciliation_core_status = result.reconciliation.core_content_status || null;
  result.author_count_status = result.reconciliation.author_count_status || null;

  const reconciliationReady = result.reconciliation.status === 'RECONCILED';
  const provenanceReady = result.provenance.status === 'PROVENANCE_READY';
  const reviewFree = result.review_gates.length === 0;

  if (!provenanceReady || !reconciliationReady || !reviewFree) {
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
      else if (report.status === 'ARTIFACT_AMBIGUOUS') process.exitCode = 5;
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

module.exports = {
  VALIDATOR_VERSION,
  discoverArtifacts,
  safeDiscoveryRecord,
  validateSourcePackage,
  walk
};
