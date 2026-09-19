const fs = require('fs');
const path = require('path');

const VALIDATOR_VERSION = '1.1.0';
const CORE_METRICS = ['published_posts','pages','media','categories','tags'];
const METRICS = [...CORE_METRICS, 'authors_users'];

function normalizeHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) out[String(key).toLowerCase()] = value;
  return out;
}

async function fetchWpTotal(base, endpoint, extra = '') {
  const url = base.replace(/\/$/, '') + '/' + endpoint + '?per_page=1&_envelope=1' + extra;
  const response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'HealthTimes-AG03-ReadOnlyInventory/1.1' } });
  if (!response.ok) {
    const error = new Error('REST_INVENTORY_REQUEST_FAILED');
    error.status = response.status;
    throw error;
  }
  const envelope = await response.json();
  const headers = normalizeHeaders(envelope.headers || {});
  const total = Number(headers['x-wp-total']);
  if (!Number.isFinite(total)) throw new Error('REST_INVENTORY_TOTAL_MISSING');
  return total;
}

async function fetchLiveInventory(base = 'https://healthtimes.co.zw/wp-json/wp/v2', options = {}) {
  const capturedAt = new Date().toISOString();
  const [published_posts, pages, media, categories, tags] = await Promise.all([
    fetchWpTotal(base, 'posts', '&status=publish'),
    fetchWpTotal(base, 'pages', '&status=publish'),
    fetchWpTotal(base, 'media'),
    fetchWpTotal(base, 'categories', '&hide_empty=false'),
    fetchWpTotal(base, 'tags', '&hide_empty=false')
  ]);

  let authors_users = null;
  let author_count_source = 'UNAVAILABLE_FROM_PUBLIC_REST';
  let author_rest_status = 'UNAVAILABLE_FROM_PUBLIC_REST';

  if (Number.isFinite(Number(options.adminUserCount))) {
    authors_users = Number(options.adminUserCount);
    author_count_source = 'SANITIZED_ADMIN_CAPTURE';
    author_rest_status = 'NOT_REQUIRED_ADMIN_OVERRIDE';
  } else {
    try {
      authors_users = await fetchWpTotal(base, 'users');
      author_count_source = 'WORDPRESS_PUBLIC_REST_READ_ONLY';
      author_rest_status = 'AVAILABLE';
    } catch (error) {
      author_rest_status = error && error.status ? 'UNAVAILABLE_HTTP_' + error.status : 'UNAVAILABLE_FROM_PUBLIC_REST';
    }
  }

  return {
    source: 'WORDPRESS_PUBLIC_REST_READ_ONLY',
    captured_at: capturedAt,
    base_identity: 'healthtimes_wordpress_rest',
    counts: { published_posts, pages, media, categories, tags, authors_users },
    availability: {
      core_content: 'AVAILABLE',
      authors_users: authors_users == null ? 'UNAVAILABLE_FROM_PUBLIC_REST' : 'AVAILABLE'
    },
    author_count_source,
    author_rest_status
  };
}

function classifyDifference(liveValue, dbValue, liveTimestamp, dbTimestamp) {
  if (dbValue == null && liveValue != null) return 'MISSING_FROM_DATABASE';
  if (liveValue == null && dbValue != null) return 'DATABASE_ONLY';
  if (liveValue == null && dbValue == null) return 'REQUIRES_REVIEW';
  if (Number(liveValue) === Number(dbValue)) return 'MATCH';
  const liveTime = liveTimestamp ? Date.parse(liveTimestamp) : NaN;
  const dbTime = dbTimestamp ? Date.parse(dbTimestamp) : NaN;
  if (Number.isFinite(liveTime) && Number.isFinite(dbTime) && liveTime > dbTime && Number(liveValue) >= Number(dbValue)) {
    return 'EXPECTED_SOURCE_DRIFT';
  }
  return 'REQUIRES_REVIEW';
}

function reconcileInventories(liveInventory, databaseReport) {
  const dbCounts = (databaseReport && databaseReport.authoritative_inventory) || {};
  const liveCounts = (liveInventory && liveInventory.counts) || {};
  const items = {};

  for (const metric of CORE_METRICS) {
    const live = liveCounts[metric] == null ? null : Number(liveCounts[metric]);
    const database = dbCounts[metric] == null ? null : Number(dbCounts[metric]);
    items[metric] = {
      live_read_only_count: live,
      authoritative_database_count: database,
      classification: classifyDifference(live, database, liveInventory && liveInventory.captured_at, databaseReport && databaseReport.export_timestamp)
    };
  }

  const liveAuthors = liveCounts.authors_users == null ? null : Number(liveCounts.authors_users);
  const databaseAuthors = dbCounts.authors_users == null ? null : Number(dbCounts.authors_users);
  const authorUnavailable = liveAuthors == null &&
    (!liveInventory || !liveInventory.availability || liveInventory.availability.authors_users === 'UNAVAILABLE_FROM_PUBLIC_REST');

  items.authors_users = {
    live_read_only_count: liveAuthors,
    authoritative_database_count: databaseAuthors,
    source: liveInventory && liveInventory.author_count_source || null,
    classification: authorUnavailable
      ? 'UNAVAILABLE_FROM_PUBLIC_REST'
      : classifyDifference(liveAuthors, databaseAuthors, liveInventory && liveInventory.captured_at, databaseReport && databaseReport.export_timestamp)
  };

  const coreClassifications = CORE_METRICS.map(metric => items[metric].classification);
  const coreReconciled = coreClassifications.every(v => v === 'MATCH' || v === 'EXPECTED_SOURCE_DRIFT');
  const authorReconciled = items.authors_users.classification === 'MATCH' || items.authors_users.classification === 'EXPECTED_SOURCE_DRIFT';
  const authorNeedsEvidence = items.authors_users.classification === 'UNAVAILABLE_FROM_PUBLIC_REST';

  let status = 'RECONCILIATION_INCOMPLETE';
  let core_content_status = 'CORE_CONTENT_REQUIRES_REVIEW';
  let author_count_status = 'AUTHOR_COUNT_REQUIRES_REVIEW';

  if (coreReconciled) {
    core_content_status = 'CORE_CONTENT_RECONCILED';
    if (authorReconciled) {
      author_count_status = 'AUTHOR_COUNT_RECONCILED';
      status = 'RECONCILED';
    } else if (authorNeedsEvidence) {
      author_count_status = 'AUTHOR_COUNT_REQUIRES_PRIVATE_OR_ADMIN_EVIDENCE';
      status = 'CORE_CONTENT_RECONCILED';
    }
  }

  return {
    validator: 'source_inventory_reconciliation',
    validator_version: VALIDATOR_VERSION,
    reconciliation_timestamp: new Date().toISOString(),
    live_inventory_timestamp: liveInventory && liveInventory.captured_at || null,
    database_export_timestamp: databaseReport && databaseReport.export_timestamp || null,
    items,
    core_content_status,
    author_count_status,
    status
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--database-report') args.databaseReport = argv[++i];
    else if (argv[i] === '--live-inventory') args.liveInventory = argv[++i];
    else if (argv[i] === '--live-rest-base') args.liveRestBase = argv[++i];
    else if (argv[i] === '--admin-user-count') args.adminUserCount = Number(argv[++i]);
  }
  if (!args.databaseReport) throw new Error('DATABASE_REPORT_REQUIRED');
  return args;
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      const db = readJson(path.resolve(args.databaseReport));
      const live = args.liveInventory
        ? readJson(path.resolve(args.liveInventory))
        : await fetchLiveInventory(args.liveRestBase || undefined, { adminUserCount: args.adminUserCount });
      const report = reconcileInventories(live, db);
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (report.status !== 'RECONCILED') process.exitCode = 4;
    } catch {
      process.stdout.write(JSON.stringify({
        validator: 'source_inventory_reconciliation',
        validator_version: VALIDATOR_VERSION,
        status: 'RECONCILIATION_INCOMPLETE',
        core_content_status: 'CORE_CONTENT_REQUIRES_REVIEW',
        author_count_status: 'AUTHOR_COUNT_REQUIRES_PRIVATE_OR_ADMIN_EVIDENCE',
        errors: [{ code: 'RECONCILIATION_INPUT_ERROR', message: 'Inventory reconciliation could not be completed from the supplied sanitized inputs.' }]
      }, null, 2) + '\n');
      process.exitCode = 4;
    }
  })();
}

module.exports = {
  CORE_METRICS,
  METRICS,
  VALIDATOR_VERSION,
  classifyDifference,
  fetchLiveInventory,
  fetchWpTotal,
  normalizeHeaders,
  reconcileInventories
};
