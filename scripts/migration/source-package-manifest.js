const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VALIDATOR_VERSION = '2.0.0';
const SENSITIVE_ROOTS = new Set(['wordpress','google','commerce','advertising','audience','hosting']);

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytesRead));
  } finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

function walkFiles(rootDir) {
  const result = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(fullPath));
    else if (entry.isFile()) result.push(fullPath);
  }
  return result.sort();
}

function formatFromPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.sql.gz')) return 'sql.gz';
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz';
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.sql')) return 'sql';
  return path.extname(lower).replace(/^\./, '') || 'binary';
}

function contentTypeFromFormat(format) {
  const map = {
    'sql': 'application/sql',
    'sql.gz': 'application/gzip',
    'tar.gz': 'application/gzip',
    'zip': 'application/zip',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'json': 'application/json'
  };
  return map[format] || 'application/octet-stream';
}

function sourceSystemFromRelative(relativePath) {
  const first = relativePath.split(path.sep)[0].toLowerCase();
  return SENSITIVE_ROOTS.has(first) ? first : 'other';
}

function inferArtifactRole(relativePath, format) {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  if (format === 'sql' || format === 'sql.gz') return 'AUTHORITATIVE_WORDPRESS_DATABASE';
  if ((format === 'tar.gz' || format === 'zip') && /(uploads|media)/.test(normalized)) return 'AUTHORITATIVE_WORDPRESS_UPLOADS';
  if (format === 'xml' && /(wordpress|wxr|export)/.test(normalized)) return 'SUPPLEMENTARY_WORDPRESS_WXR';
  if (/google|analytics|search-console|adsense/.test(normalized)) return 'SUPPLEMENTARY_GOOGLE_EVIDENCE';
  if (/commerce|woocommerce|subscription|membership|payment/.test(normalized)) return 'SUPPLEMENTARY_COMMERCE_EXPORT';
  if (/advertis|campaign|creative/.test(normalized)) return 'SUPPLEMENTARY_ADVERTISING_SOURCE';
  if (/audience|newsletter|subscriber|whatsapp/.test(normalized)) return 'SUPPLEMENTARY_AUDIENCE_SOURCE';
  if (/hosting|cpanel|plesk|sftp/.test(normalized)) return 'SUPPLEMENTARY_HOSTING_EVIDENCE';
  return 'SUPPLEMENTARY_SOURCE_ARTIFACT';
}

function isAuthoritativeRole(role) {
  return role.startsWith('AUTHORITATIVE_');
}

function assertOutsideRepository(rootDir, repoDir = process.cwd()) {
  const root = fs.realpathSync(rootDir);
  const repo = fs.realpathSync(repoDir);
  const relative = path.relative(repo, root);
  if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Source package root must be outside the Git repository. Private exports must never be stored in the repo.');
  }
}

function buildManifest(rootDir, options = {}) {
  assertOutsideRepository(rootDir, options.repoDir || process.cwd());
  const files = walkFiles(rootDir);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const snapshotId = options.snapshotId || ('rehearsal-snapshot-' + generatedAt.replace(/[:.]/g, '-'));
  const validationByRole = options.validationByRole || {};

  return {
    schema_version: '2.0',
    validator_version: VALIDATOR_VERSION,
    snapshot_id: snapshotId,
    snapshot_type: 'rehearsal',
    snapshot_relationship: 'PRE_CUTOVER_REHEARSAL_SOURCE',
    content_freeze_status: 'NOT_FROZEN',
    generated_at: generatedAt,
    validation_timestamp: generatedAt,
    private_workspace_location: 'secure source package workspace',
    artifact_count: files.length,
    artifacts: files.map((filePath, index) => {
      const relative = path.relative(rootDir, filePath);
      const stat = fs.statSync(filePath);
      const format = formatFromPath(filePath);
      const role = inferArtifactRole(relative, format);
      const sourceSystem = sourceSystemFromRelative(relative);
      return {
        safe_identifier: 'artifact_' + String(index + 1).padStart(4, '0'),
        artifact_role: role,
        validator_version: VALIDATOR_VERSION,
        capture_export_timestamp: null,
        received_timestamp: stat.mtime.toISOString(),
        validation_timestamp: generatedAt,
        validation_status: validationByRole[role] || 'CHECKSUMMED_NOT_CONTENT_VALIDATED',
        content_type: contentTypeFromFormat(format),
        format,
        size_bytes: stat.size,
        sha256: sha256File(filePath),
        source_class: sourceSystem.toUpperCase(),
        source_system: sourceSystem,
        snapshot_relationship: isAuthoritativeRole(role) ? 'AUTHORITATIVE_SOURCE' : 'SUPPLEMENTARY_SOURCE',
        authoritative: isAuthoritativeRole(role),
        sensitivity: 'PRIVATE_CLIENT_SOURCE',
        notes: 'Filename and local path intentionally omitted from repository-safe manifest output.'
      };
    })
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') args.root = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--snapshot') args.snapshotId = argv[++i];
  }
  if (!args.root) throw new Error('Usage: node source-package-manifest.js --root <private-workspace> [--out <manifest.json>] [--snapshot <id>]');
  return args;
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const manifest = buildManifest(path.resolve(args.root), { snapshotId: args.snapshotId });
    const serialized = JSON.stringify(manifest, null, 2) + '\n';
    if (args.out) {
      fs.writeFileSync(path.resolve(args.out), serialized, { mode: 0o600 });
      console.log('Wrote repository-safe manifest metadata for ' + manifest.artifact_count + ' artifact(s).');
    } else {
      process.stdout.write(serialized);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  VALIDATOR_VERSION,
  assertOutsideRepository,
  buildManifest,
  contentTypeFromFormat,
  formatFromPath,
  inferArtifactRole,
  isAuthoritativeRole,
  sha256File,
  sourceSystemFromRelative,
  walkFiles
};
