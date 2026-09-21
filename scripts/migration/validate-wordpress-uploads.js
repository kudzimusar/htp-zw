const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const VALIDATOR_VERSION = '1.2.0';
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
  let symlinkCount = 0;
  let hardlinkFileCount = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        symlinkCount += 1;
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) {
        if (stat.nlink > 1) hardlinkFileCount += 1;
        files.push({ full, rel, stat });
      }
    }
  }
  walk(root);
  return { files, symlinkCount, hardlinkFileCount };
}

function treeHash(files) {
  const hash = crypto.createHash('sha256');
  const entries = files.map(f => ({ size: f.stat.size, hash: sha256File(f.full) }))
    .sort((a, b) => a.hash.localeCompare(b.hash) || a.size - b.size);
  for (const entry of entries) hash.update(entry.hash + ':' + entry.size + '\n');
  return hash.digest('hex');
}

function validateExtractedDirectory(rootDir) {
  const { files, symlinkCount, hardlinkFileCount } = listTree(rootDir);
  const extensions = {};
  const mimeTypes = {};
  const yearMonth = {};
  let zeroByteFileCount = 0;
  let unreadableFileCount = 0;
  let malformedPathCount = 0;
  const scriptExtensions = {};
  const hashCounts = new Map();
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += file.stat.size;
    const ext = extensionOf(file.rel);
    extensions[ext] = (extensions[ext] || 0) + 1;
    const mime = mimeForExtension(ext);
    mimeTypes[mime] = (mimeTypes[mime] || 0) + 1;
    if (file.stat.size === 0) zeroByteFileCount += 1;
    if (isMalformedArchivePath(file.rel)) malformedPathCount += 1;
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
      unreadableFileCount += 1;
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
    zero_byte_file_count: zeroByteFileCount,
    duplicate_hash_groups: duplicateGroups,
    duplicate_file_count: duplicateGroups.reduce((sum, g) => sum + g.copies, 0),
    unreadable_file_count: unreadableFileCount,
    malformed_path_count: malformedPathCount,
    suspicious_symlink_count: symlinkCount,
    suspicious_hardlink_file_count: hardlinkFileCount,
    unexpected_script_extensions: Object.fromEntries(Object.entries(scriptExtensions).sort()),
    unexpected_script_file_count: Object.values(scriptExtensions).reduce((a, b) => a + b, 0),
    tree_sha256: treeHash(files)
  };
}

function runCommandToFile(command, args, outputPath) {
  const fd = fs.openSync(outputPath, 'w');
  try {
    const result = spawnSync(command, args, { stdio: ['ignore', fd, 'ignore'] });
    return !result.error && result.status === 0;
  } finally {
    fs.closeSync(fd);
  }
}

function forEachLineSync(filePath, visitor) {
  const fd = fs.openSync(filePath, 'r');
  const chunk = Buffer.allocUnsafe(64 * 1024);
  let carry = '';
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
      carry += chunk.subarray(0, bytesRead).toString('utf8');
      let newline;
      while ((newline = carry.indexOf('\n')) >= 0) {
        let line = carry.slice(0, newline);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        visitor(line);
        carry = carry.slice(newline + 1);
      }
    }
    if (carry) visitor(carry);
  } finally {
    fs.closeSync(fd);
  }
}

function streamArchiveCommandLines(artifact, format, verbose, visitor) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'healthtimes-archive-list-'));
  const output = path.join(temp, 'listing.txt');
  try {
    const args = format === 'tar.gz'
      ? (verbose ? ['-tvzf', artifact] : ['-tzf', artifact])
      : (verbose ? ['-Z', '-l', artifact] : ['-Z1', artifact]);
    const ok = runCommandToFile(format === 'tar.gz' ? 'tar' : 'unzip', args, output);
    if (!ok) return false;
    forEachLineSync(output, visitor);
    return true;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function inspectArchivePaths(artifact, format) {
  let entry_count = 0;
  let malformed_path_count = 0;
  const ok = streamArchiveCommandLines(artifact, format, false, line => {
    if (!line) return;
    entry_count += 1;
    if (isMalformedArchivePath(line)) {
      malformed_path_count += 1;
      return;
    }
    try {
      assertTargetInside('/healthtimes-archive-validation-root', line);
    } catch {
      malformed_path_count += 1;
    }
  });
  return ok
    ? { status: 'INSPECTED', entry_count, malformed_path_count }
    : { status: 'INSPECTION_FAILED', entry_count: null, malformed_path_count: null };
}

function inspectArchiveMemberTypes(artifact, format) {
  let symlink_count = 0;
  let hardlink_count = 0;
  const ok = streamArchiveCommandLines(artifact, format, true, line => {
    const trimmed = line.trimStart();
    if (!trimmed) return;
    const type = trimmed[0];
    if (type === 'l') symlink_count += 1;
    if (type === 'h') hardlink_count += 1;
  });
  return ok
    ? { status: 'INSPECTED', symlink_count, hardlink_count }
    : { status: 'INSPECTION_FAILED', symlink_count: null, hardlink_count: null };
}

function testArchiveIntegrity(artifact, format) {
  const result = format === 'tar.gz'
    ? spawnSync('tar', ['-tzf', artifact], { stdio: ['ignore','ignore','ignore'] })
    : spawnSync('unzip', ['-tqq', artifact], { stdio: ['ignore','ignore','ignore'] });
  return !result.error && result.status === 0;
}

function assertTargetInside(targetRoot, relativePath) {
  const root = path.resolve(targetRoot);
  const candidate = path.resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) throw new Error('ARCHIVE_PATH_ESCAPE');
}

function extractArchive(artifact, format, target) {
  const result = format === 'tar.gz'
    ? spawnSync('tar', ['-xzf', artifact, '-C', target, '--no-same-owner', '--no-same-permissions'], { stdio: ['ignore','ignore','ignore'] })
    : spawnSync('unzip', ['-qq', artifact, '-d', target], { stdio: ['ignore','ignore','ignore'] });
  if (result.error || result.status !== 0) throw new Error('ARCHIVE_EXTRACTION_FAILED');
}

function detectFormat(artifact) {
  if (fs.existsSync(artifact) && fs.statSync(artifact).isDirectory()) return 'directory';
  const lower = String(artifact).toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz';
  if (lower.endsWith('.zip')) return 'zip';
  return 'unknown';
}

function validateUploadsArtifact(artifact) {
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
    archive_member_safety: { status: 'NOT_APPLICABLE', symlink_count: 0, hardlink_count: 0 },
    validation_status: 'INVALID',
    metrics: null,
    security_findings: [],
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
  } else {
    const stat = fs.statSync(artifact);
    report.size_bytes = stat.size;
    report.sha256 = sha256File(artifact);

    const pathInspection = inspectArchivePaths(artifact, format);
    if (pathInspection.status !== 'INSPECTED') {
      report.archive_integrity = 'FAIL';
      report.errors.push({ code: 'ARCHIVE_LIST_FAILED', message: 'Archive could not be listed safely.' });
      return report;
    }

    if (pathInspection.malformed_path_count) {
      report.archive_integrity = 'FAIL';
      report.errors.push({ code: 'MALFORMED_ARCHIVE_PATH', message: 'Archive contains unsafe or malformed paths.', count: pathInspection.malformed_path_count });
      return report;
    }

    report.archive_member_safety = inspectArchiveMemberTypes(artifact, format);
    if (report.archive_member_safety.status !== 'INSPECTED') {
      report.errors.push({ code: 'ARCHIVE_MEMBER_TYPE_INSPECTION_FAILED', message: 'Archive member types could not be inspected safely.' });
      return report;
    }
    if (report.archive_member_safety.symlink_count > 0 || report.archive_member_safety.hardlink_count > 0) {
      report.archive_integrity = 'FAIL';
      report.security_findings.push({
        code: 'ARCHIVE_LINK_ENTRY_REJECTED',
        severity: 'BLOCKING',
        symlink_count: report.archive_member_safety.symlink_count,
        hardlink_count: report.archive_member_safety.hardlink_count
      });
      report.errors.push({ code: 'ARCHIVE_LINK_ENTRY_REJECTED', message: 'Archive contains symlink or hardlink members and was not extracted.' });
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
      report.errors.push({ code: 'ARCHIVE_EXTRACTION_FAILED', message: 'Archive could not be extracted safely into the disposable validation workspace.' });
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }

  if (report.metrics) {
    if (report.metrics.malformed_path_count) report.errors.push({ code: 'MALFORMED_MEDIA_PATHS', message: 'Extracted uploads contain malformed paths.', count: report.metrics.malformed_path_count });
    if (report.metrics.unreadable_file_count) report.errors.push({ code: 'UNREADABLE_MEDIA_FILES', message: 'One or more media files are unreadable.', count: report.metrics.unreadable_file_count });
    if (report.metrics.suspicious_symlink_count || report.metrics.suspicious_hardlink_file_count) {
      report.security_findings.push({
        code: 'FILESYSTEM_LINKS_REJECTED',
        severity: 'BLOCKING',
        symlink_count: report.metrics.suspicious_symlink_count,
        hardlink_file_count: report.metrics.suspicious_hardlink_file_count
      });
      report.errors.push({ code: 'FILESYSTEM_LINKS_REJECTED', message: 'Uploads tree contains symbolic or hard-linked files.' });
    }
    if (report.metrics.unexpected_script_file_count) {
      report.security_findings.push({
        code: 'UNEXPECTED_EXECUTABLE_OR_SCRIPT_IN_UPLOADS',
        severity: 'REVIEW_REQUIRED',
        count: report.metrics.unexpected_script_file_count,
        extensions: report.metrics.unexpected_script_extensions
      });
    }
  }

  if (report.errors.length) report.validation_status = 'INVALID';
  else if (report.security_findings.some(f => f.severity === 'REVIEW_REQUIRED')) report.validation_status = 'VALID_REQUIRES_REVIEW';
  else report.validation_status = 'VALID';
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
    if (report.validation_status === 'INVALID') process.exitCode = 3;
    else if (report.validation_status === 'VALID_REQUIRES_REVIEW') process.exitCode = 4;
  } catch {
    process.stdout.write(JSON.stringify({
      validator: 'wordpress_uploads',
      validator_version: VALIDATOR_VERSION,
      validation_status: 'INVALID',
      errors: [{ code: 'VALIDATOR_ARGUMENT_ERROR', message: 'Uploads artifact argument is required.' }]
    }, null, 2) + '\n');
    process.exitCode = 3;
  }
}

module.exports = {
  MIME_BY_EXTENSION,
  SCRIPT_EXTENSIONS,
  VALIDATOR_VERSION,
  assertTargetInside,
  detectFormat,
  extensionOf,
  inspectArchiveMemberTypes,
  inspectArchivePaths,
  isMalformedArchivePath,
  mimeForExtension,
  validateExtractedDirectory,
  validateUploadsArtifact
};
