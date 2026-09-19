const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VALIDATOR_VERSION = '1.0.0';
const SCRIPT_EXTENSIONS = new Set(['php','phtml','phar','cgi','pl','py','rb','sh','bash','zsh','js','mjs','cjs','exe','dll','bat','cmd','ps1']);
const MIME_BY_EXTENSION = {
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp',
  svg:'image/svg+xml', avif:'image/avif', heic:'image/heic', bmp:'image/bmp',
  pdf:'application/pdf', txt:'text/plain', csv:'text/csv', json:'application/json',
  mp3:'audio/mpeg', wav:'audio/wav', m4a:'audio/mp4', ogg:'audio/ogg',
  mp4:'video/mp4', mov:'video/quicktime', webm:'video/webm',
  doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

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

function isMalformedArchivePath(value) {
  const p = String(value || '');
  if (!p || /[\0\r\n]/.test(p)) return true;
  if (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)) return true;
  const normalized = p.replace(/\\/g, '/');
  return normalized.split('/').some(part => part === '..');
}

function extensionOf(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  return ext || '[none]';
}

function mimeForExtension(ext) {
  return MIME_BY_EXTENSION[ext] || 'application/octet-stream';
}

function listTree(root) {
  const files = [];
  const suspiciousLinks = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        suspiciousLinks.push(rel);
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) files.push({ full, rel, stat });
    }
  }
  walk(root);
  return { files, suspiciousLinks };
}

function treeHash(files) {
  const hash = crypto.createHash('sha256');
  const entries = files.map(f => ({ size: f.stat.size, hash: sha256File(f.full) }))
    .sort((a, b) => a.hash.localeCompare(b.hash) || a.size - b.size);
  for (const entry of entries) hash.update(entry.hash + ':' + entry.size + '\n');
  return hash.digest('hex');
}

function validateExtractedDirectory(rootDir) {
  const { files, suspiciousLinks } = listTree(rootDir);
  const extensions = {};
  const mimeTypes = {};
  const yearMonth = {};
  const zeroByte = [];
  const unreadable = [];
  const malformed = [];
  const scriptExtensions = {};
  const hashCounts = new Map();
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += file.stat.size;
    const ext = extensionOf(file.rel);
    extensions[ext] = (extensions[ext] || 0) + 1;
    const mime = mimeForExtension(ext);
    mimeTypes[mime] = (mimeTypes[mime] || 0) + 1;
    if (file.stat.size === 0) zeroByte.push(true);
    if (isMalformedArchivePath(file.rel)) malformed.push(true);
    if (SCRIPT_EXTENSIONS.has(ext)) scriptExtensions[ext] = (scriptExtensions[ext] || 0) + 1;
    const parts = file.rel.replace(/\\/g, '/').split('/');
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (/^(19|20)\d{2}$/.test(parts[i]) && /^(0[1-9]|1[0-2])$/.test(parts[i + 1])) {
        const key = parts[i] + '/' + parts[i + 1];
        yearMonth[key] = (yearMonth[key] || 0) + 1;
        break;
      }
    }
    try {
      fs.accessSync(file.full, fs.constants.R_OK);
      const digest = sha256File(file.full);
      hashCounts.set(digest, (hashCounts.get(digest) || 0) + 1);
    } catch {
      unreadable.push(true);
    }
  }
  const duplicateGroups = [...hashCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sha256, count]) => ({ sha256, copies: count }))
    .sort((a, b) => b.copies - a.copies || a.sha256.localeCompare(b.sha256));

  return {
    file_count: files.length,
    total_bytes: totalBytes,
    extension_distribution: Object.fromEntries(Object.entries(extensions).sort()),
    mime_type_distribution: Object.fromEntries(Object.entries(mimeTypes).sort()),
    year_month_distribution: Object.fromEntries(Object.entries(yearMonth).sort()),
    zero_byte_file_count: zeroByte.length,
    duplicate_hash_groups: duplicateGroups,
    duplicate_file_count: duplicateGroups.reduce((sum, g) => sum + g.copies, 0),
    unreadable_file_count: unreadable.length,
    malformed_path_count: malformed.length,
    suspicious_symlink_count: suspiciousLinks.length,
    unexpected_script_extensions: Object.fromEntries(Object.entries(scriptExtensions).sort()),
    unexpected_script_file_count: Object.values(scriptExtensions).reduce((a, b) => a + b, 0),
    tree_sha256: treeHash(files)
  };
}

function listArchiveEntries(artifact, format) {
  try {
    if (format === 'tar.gz') {
      return execFileSync('tar', ['-tzf', artifact], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] })
        .split(/\r?\n/).filter(Boolean);
    }
    return execFileSync('unzip', ['-Z1', artifact], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] })
      .split(/\r?\n/).filter(Boolean);
  } catch {
    return null;
  }
}

function testArchiveIntegrity(artifact, format) {
  try {
    if (format === 'tar.gz') execFileSync('tar', ['-tzf', artifact], { stdio: ['ignore','ignore','ignore'] });
    else execFileSync('unzip', ['-tqq', artifact], { stdio: ['ignore','ignore','ignore'] });
    return true;
  } catch { return false; }
}

function extractArchive(artifact, format, target) {
  if (format === 'tar.gz') {
    execFileSync('tar', ['-xzf', artifact, '-C', target, '--no-same-owner'], { stdio: ['ignore','ignore','ignore'] });
  } else {
    execFileSync('unzip', ['-qq', artifact, '-d', target], { stdio: ['ignore','ignore','ignore'] });
  }
}

function detectFormat(artifact) {
  if (fs.existsSync(artifact) && fs.statSync(artifact).isDirectory()) return 'directory';
  const lower = String(artifact).toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz';
  if (lower.endsWith('.zip')) return 'zip';
  return 'unknown';
}

function validateUploadsArtifact(artifact, options = {}) {
  const report = {
    validator: 'wordpress_uploads',
    validator_version: VALIDATOR_VERSION,
    artifact_role: 'AUTHORITATIVE_WORDPRESS_UPLOADS',
    format: null,
    size_bytes: null,
    sha256: null,
    validation_timestamp: new Date().toISOString(),
    file_exists: false,
    file_readable: false,
    archive_integrity: 'NOT_APPLICABLE',
    validation_status: 'INVALID',
    metrics: null,
    errors: []
  };
  try {
    if (!fs.existsSync(artifact)) {
      report.errors.push({ code: 'ARTIFACT_MISSING', message: 'Uploads artifact is missing.' });
      return report;
    }
    report.file_exists = true;
    fs.accessSync(artifact, fs.constants.R_OK);
    report.file_readable = true;
  } catch {
    report.errors.push({ code: 'ARTIFACT_UNREADABLE', message: 'Uploads artifact is unreadable.' });
    return report;
  }

  const format = detectFormat(artifact);
  report.format = format;
  if (format === 'unknown') {
    report.errors.push({ code: 'UNSUPPORTED_FORMAT', message: 'Expected .tar.gz, .zip, or an extracted uploads directory.' });
    return report;
  }

  if (format === 'directory') {
    report.metrics = validateExtractedDirectory(artifact);
    report.size_bytes = report.metrics.total_bytes;
    report.sha256 = report.metrics.tree_sha256;
    report.archive_integrity = 'NOT_APPLICABLE';
  } else {
    const stat = fs.statSync(artifact);
    report.size_bytes = stat.size;
    report.sha256 = sha256File(artifact);
    const entries = listArchiveEntries(artifact, format);
    if (!entries) {
      report.archive_integrity = 'FAIL';
      report.errors.push({ code: 'ARCHIVE_LIST_FAILED', message: 'Archive could not be listed safely.' });
      return report;
    }
    const malformed = entries.filter(isMalformedArchivePath);
    if (malformed.length) {
      report.archive_integrity = 'FAIL';
      report.errors.push({ code: 'MALFORMED_ARCHIVE_PATH', message: 'Archive contains unsafe or malformed paths.', count: malformed.length });
      return report;
    }
    if (!testArchiveIntegrity(artifact, format)) {
      report.archive_integrity = 'FAIL';
      report.errors.push({ code: 'ARCHIVE_INTEGRITY_FAILED', message: 'Archive integrity check failed.' });
      return report;
    }
    report.archive_integrity = 'PASS';
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'healthtimes-uploads-validate-'));
    try {
      extractArchive(artifact, format, temp);
      report.metrics = validateExtractedDirectory(temp);
    } catch {
      report.errors.push({ code: 'ARCHIVE_EXTRACTION_FAILED', message: 'Archive could not be extracted into the disposable validation workspace.' });
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }

  if (report.metrics) {
    if (report.metrics.malformed_path_count) report.errors.push({ code: 'MALFORMED_MEDIA_PATHS', message: 'Extracted uploads contain malformed paths.', count: report.metrics.malformed_path_count });
    if (report.metrics.unreadable_file_count) report.errors.push({ code: 'UNREADABLE_MEDIA_FILES', message: 'One or more media files are unreadable.', count: report.metrics.unreadable_file_count });
    if (report.metrics.suspicious_symlink_count) report.errors.push({ code: 'SYMLINKS_NOT_ALLOWED', message: 'Uploads package contains symbolic links.', count: report.metrics.suspicious_symlink_count });
  }
  report.validation_status = report.errors.length ? 'INVALID' : 'VALID';
  return report;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i] === '--artifact') out.artifact = argv[++i];
  if (!out.artifact) throw new Error('ARTIFACT_ARGUMENT_REQUIRED');
  return out;
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = validateUploadsArtifact(path.resolve(args.artifact));
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.validation_status !== 'VALID') process.exitCode = 2;
  } catch {
    process.stdout.write(JSON.stringify({
      validator: 'wordpress_uploads',
      validator_version: VALIDATOR_VERSION,
      validation_status: 'INVALID',
      errors: [{ code: 'VALIDATOR_ARGUMENT_ERROR', message: 'Uploads artifact argument is required.' }]
    }, null, 2) + '\n');
    process.exitCode = 2;
  }
}

module.exports = {
  MIME_BY_EXTENSION,
  SCRIPT_EXTENSIONS,
  VALIDATOR_VERSION,
  detectFormat,
  extensionOf,
  isMalformedArchivePath,
  mimeForExtension,
  validateExtractedDirectory,
  validateUploadsArtifact
};
