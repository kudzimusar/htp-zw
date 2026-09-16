const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SENSITIVE_ROOTS = new Set([
  'wordpress',
  'google',
  'commerce',
  'advertising',
  'audience',
  'hosting'
]);

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
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
  if (lower.endsWith('.tar.gz')) return 'tar.gz';
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.sql')) return 'sql';
  return path.extname(lower).replace(/^\./, '') || 'binary';
}

function sourceSystemFromRelative(relativePath) {
  const first = relativePath.split(path.sep)[0].toLowerCase();
  return SENSITIVE_ROOTS.has(first) ? first : 'other';
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
  const snapshotId = options.snapshotId || `rehearsal-snapshot-${generatedAt.replace(/[:.]/g, '-')}`;

  return {
    schema_version: '1.0',
    snapshot_id: snapshotId,
    snapshot_type: 'rehearsal',
    content_freeze_status: 'NOT_FROZEN',
    generated_at: generatedAt,
    private_workspace_location: 'secure source package workspace',
    artifact_count: files.length,
    artifacts: files.map((filePath, index) => {
      const relative = path.relative(rootDir, filePath);
      const stat = fs.statSync(filePath);
      return {
        safe_identifier: `artifact_${String(index + 1).padStart(4, '0')}`,
        logical_source: `${sourceSystemFromRelative(relative)}_artifact`,
        source_system: sourceSystemFromRelative(relative),
        export_date: null,
        received_date: stat.mtime.toISOString(),
        size_bytes: stat.size,
        sha256: sha256File(filePath),
        format: formatFromPath(filePath),
        validation_status: 'CHECKSUMMED_NOT_CONTENT_VALIDATED',
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
      console.log(`Wrote repository-safe manifest metadata for ${manifest.artifact_count} artifact(s).`);
    } else {
      process.stdout.write(serialized);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  assertOutsideRepository,
  buildManifest,
  formatFromPath,
  sha256File,
  sourceSystemFromRelative,
  walkFiles
};
