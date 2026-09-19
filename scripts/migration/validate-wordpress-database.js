const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const readline = require('readline');
const { execFileSync } = require('child_process');

const VALIDATOR_VERSION = '1.0.0';

const CORE_SUFFIXES = [
  'commentmeta','comments','links','options','postmeta','posts',
  'term_relationships','term_taxonomy','termmeta','terms','usermeta','users'
];

const ESSENTIAL_CORE_SUFFIXES = [
  'options','postmeta','posts','term_relationships','term_taxonomy','terms','usermeta','users'
];

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytesRead));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function safeError(code, message) {
  return { code, message };
}

function normalizeIdentifier(value) {
  return String(value || '').replace(/^[`"']+|[`"']+$/g, '');
}

function detectPrefix(tableNames) {
  const scores = new Map();
  for (const table of tableNames) {
    for (const suffix of CORE_SUFFIXES) {
      if (table === suffix) scores.set('', (scores.get('') || 0) + 1);
      else if (table.endsWith(suffix)) {
        const prefix = table.slice(0, -suffix.length);
        scores.set(prefix, (scores.get(prefix) || 0) + 1);
      }
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked.length && ranked[0][1] >= 4 ? ranked[0][0] : null;
}

function splitSqlFields(rowBody) {
  const fields = [];
  let current = '';
  let quote = null;
  let escaped = false;
  for (let i = 0; i < rowBody.length; i += 1) {
    const ch = rowBody[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (quote && ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (rowBody[i + 1] === quote) {
          current += rowBody[++i];
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      fields.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function extractValueRows(valuesSql) {
  const rows = [];
  let depth = 0;
  let quote = null;
  let escaped = false;
  let start = -1;
  for (let i = 0; i < valuesSql.length; i += 1) {
    const ch = valuesSql[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && ch === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        if (valuesSql[i + 1] === quote) i += 1;
        else quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        rows.push(valuesSql.slice(start, i));
        start = -1;
      }
    }
  }
  return rows;
}

function decodeSqlScalar(raw) {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (/^NULL$/i.test(value)) return null;
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    const q = value[0];
    return value.slice(1, -1)
      .replace(new RegExp(q + q, 'g'), q)
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return value;
}

function parseCreateStatement(statement) {
  const match = statement.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([^`\s(]+)`?\s*\(/i);
  if (!match) return null;
  const table = normalizeIdentifier(match[1]);
  const columns = [];
  for (const line of statement.split(/\r?\n/)) {
    const col = line.trim().match(/^`([^`]+)`\s+/);
    if (col) columns.push(col[1]);
  }
  return { table, columns };
}

function parseInsertStatement(statement) {
  const match = statement.match(/INSERT\s+INTO\s+`?([^`\s(]+)`?\s*(?:\(([^)]*)\))?\s+VALUES\s+([\s\S]*?);?\s*$/i);
  if (!match) return null;
  const explicitColumns = match[2]
    ? match[2].split(',').map(v => normalizeIdentifier(v.trim()))
    : null;
  return { table: normalizeIdentifier(match[1]), explicitColumns, valuesSql: match[3] };
}

function classifyTables(tableNames, prefix) {
  const core = new Set(CORE_SUFFIXES.map(s => (prefix == null ? null : prefix + s)).filter(Boolean));
  const groups = {
    wordpress_core: [],
    woocommerce: [],
    subscriptions: [],
    memberships: [],
    payments: [],
    audience_forms: [],
    custom_plugin: []
  };
  for (const table of tableNames) {
    const lower = table.toLowerCase();
    if (core.has(table)) groups.wordpress_core.push(table);
    else if (/(subscription|wcs_)/.test(lower)) groups.subscriptions.push(table);
    else if (/(membership|wc_memberships)/.test(lower)) groups.memberships.push(table);
    else if (/(payment|paypal|paynow|stripe)/.test(lower)) groups.payments.push(table);
    else if (/(wpforms|newsletter|mailpoet|subscriber|contact|fluentcrm|mailchimp|audience)/.test(lower)) groups.audience_forms.push(table);
    else if (/(woocommerce|(?:^|_)wc_|actionscheduler)/.test(lower)) groups.woocommerce.push(table);
    else groups.custom_plugin.push(table);
  }
  for (const key of Object.keys(groups)) groups[key].sort();
  return groups;
}

function buildColumnSignals(schema, prefix) {
  const has = (suffix, column) => {
    if (prefix == null) return false;
    const cols = schema.get(prefix + suffix) || [];
    return cols.includes(column);
  };
  return {
    post_ids: has('posts', 'ID'),
    post_author_relationship: has('posts', 'post_author'),
    post_parent_relationship: has('posts', 'post_parent'),
    post_slug: has('posts', 'post_name'),
    post_guid: has('posts', 'guid'),
    attachment_ids: has('posts', 'ID'),
    user_ids: has('users', 'ID'),
    term_ids: has('terms', 'term_id'),
    term_taxonomy_ids: has('term_taxonomy', 'term_taxonomy_id'),
    term_taxonomy_term_relationship: has('term_taxonomy', 'term_id'),
    postmeta_relationship: has('postmeta', 'post_id')
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--artifact') out.artifact = argv[++i];
    else if (key === '--export-timestamp') out.exportTimestamp = argv[++i];
    else if (key === '--disposable-db') out.disposableDb = argv[++i];
    else if (key === '--mysql-user') out.mysqlUser = argv[++i];
    else if (key === '--mysql-host') out.mysqlHost = argv[++i];
    else if (key === '--mysql-port') out.mysqlPort = argv[++i];
    else if (key === '--mysql-socket') out.mysqlSocket = argv[++i];
  }
  if (!out.artifact) throw new Error('ARTIFACT_ARGUMENT_REQUIRED');
  return out;
}

function queryDisposableRestore(options = {}) {
  if (!options.disposableDb) return { queried: false, status: 'NOT_REQUESTED' };
  if (!/^[A-Za-z0-9_]+$/.test(options.disposableDb)) {
    return { queried: false, status: 'INVALID_DATABASE_IDENTIFIER' };
  }
  const args = ['--batch', '--skip-column-names'];
  if (options.mysqlHost) args.push('-h', options.mysqlHost);
  if (options.mysqlPort) args.push('-P', String(options.mysqlPort));
  if (options.mysqlSocket) args.push('--socket', options.mysqlSocket);
  if (options.mysqlUser) args.push('-u', options.mysqlUser);
  args.push('-e', "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = '" + options.disposableDb + "' ORDER BY table_name;");
  try {
    const raw = execFileSync('mysql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const row_estimates = {};
    for (const line of raw.trim().split(/\r?\n/)) {
      if (!line) continue;
      const [name, count] = line.split('\t');
      row_estimates[name] = Number(count || 0);
    }
    return { queried: true, status: 'OK', table_count: Object.keys(row_estimates).length, row_estimates };
  } catch {
    return { queried: false, status: 'MYSQL_QUERY_FAILED' };
  }
}

async function validateDatabaseArtifact(filePath, options = {}) {
  const report = {
    validator: 'wordpress_database',
    validator_version: VALIDATOR_VERSION,
    artifact_role: 'AUTHORITATIVE_WORDPRESS_DATABASE',
    format: null,
    size_bytes: null,
    sha256: null,
    export_timestamp: options.exportTimestamp || null,
    validation_timestamp: new Date().toISOString(),
    file_exists: false,
    file_readable: false,
    gzip_integrity: 'NOT_APPLICABLE',
    sql_structure_readable: false,
    validation_status: 'INVALID',
    wordpress_table_prefix: null,
    table_count: 0,
    tables: [],
    table_groups: {},
    missing_expected_core_tables: [],
    missing_essential_core_tables: [],
    estimated_insert_rows_by_table: {},
    authoritative_inventory: {
      published_posts: null,
      pages: null,
      media: null,
      categories: null,
      tags: null,
      authors_users: null
    },
    provenance_signals: {},
    commerce_signals: {
      woocommerce_present: false,
      subscriptions_present: false,
      memberships_present: false,
      payment_tables_present: false
    },
    content_signals: {
      featured_media_relationships: false,
      permalink_structure_key_seen: false,
      shop_order_rows_seen: false,
      shop_subscription_rows_seen: false
    },
    disposable_restore: { queried: false, status: 'NOT_REQUESTED' },
    errors: []
  };

  let stat;
  try {
    stat = fs.statSync(filePath);
    report.file_exists = stat.isFile();
    if (!report.file_exists) {
      report.errors.push(safeError('ARTIFACT_NOT_FILE', 'Database artifact is not a regular file.'));
      return report;
    }
    fs.accessSync(filePath, fs.constants.R_OK);
    report.file_readable = true;
    report.size_bytes = stat.size;
    report.sha256 = sha256File(filePath);
  } catch {
    report.errors.push(safeError('ARTIFACT_UNREADABLE', 'Database artifact is missing or unreadable.'));
    return report;
  }

  const lower = String(filePath).toLowerCase();
  const isGzip = lower.endsWith('.sql.gz');
  report.format = isGzip ? 'sql.gz' : lower.endsWith('.sql') ? 'sql' : 'unknown';
  if (report.format === 'unknown') {
    report.errors.push(safeError('UNSUPPORTED_FORMAT', 'Expected .sql or .sql.gz database artifact.'));
    return report;
  }

  const schema = new Map();
  const rowCounts = {};
  const publishedAuthors = new Set();
  let prefix = null;
  let featuredMediaKeySeen = false;
  let permalinkKeySeen = false;
  let shopOrderRowsSeen = false;
  let shopSubscriptionRowsSeen = false;

  let source = fs.createReadStream(filePath);
  if (isGzip) {
    const gunzip = zlib.createGunzip();
    source = source.pipe(gunzip);
    report.gzip_integrity = 'PENDING';
  }

  let mode = null;
  let buffer = '';
  const processStatement = statement => {
    if (mode === 'CREATE') {
      const parsed = parseCreateStatement(statement);
      if (parsed) schema.set(parsed.table, parsed.columns);
      return;
    }
    if (mode !== 'INSERT') return;
    const parsed = parseInsertStatement(statement);
    if (!parsed) return;
    const columns = parsed.explicitColumns || schema.get(parsed.table) || [];
    const rows = extractValueRows(parsed.valuesSql);
    rowCounts[parsed.table] = (rowCounts[parsed.table] || 0) + rows.length;
    if (prefix == null) prefix = detectPrefix([...schema.keys(), parsed.table]);
    const tablePrefix = prefix == null ? '' : prefix;
    const idx = name => columns.indexOf(name);

    for (const body of rows) {
      if (parsed.table === tablePrefix + 'posts' && columns.length) {
        const fields = splitSqlFields(body);
        const postType = idx('post_type') >= 0 ? decodeSqlScalar(fields[idx('post_type')]) : null;
        const postStatus = idx('post_status') >= 0 ? decodeSqlScalar(fields[idx('post_status')]) : null;
        const author = idx('post_author') >= 0 ? decodeSqlScalar(fields[idx('post_author')]) : null;
        if (postType === 'post' && postStatus === 'publish') report.authoritative_inventory.published_posts = (report.authoritative_inventory.published_posts || 0) + 1;
        if (postType === 'page' && postStatus === 'publish') report.authoritative_inventory.pages = (report.authoritative_inventory.pages || 0) + 1;
        if (postType === 'attachment') report.authoritative_inventory.media = (report.authoritative_inventory.media || 0) + 1;
        if ((postType === 'post' || postType === 'page') && postStatus === 'publish' && author != null) publishedAuthors.add(String(author));
        if (postType === 'shop_order') shopOrderRowsSeen = true;
        if (postType === 'shop_subscription') shopSubscriptionRowsSeen = true;
      } else if (parsed.table === tablePrefix + 'term_taxonomy' && columns.length) {
        const fields = splitSqlFields(body);
        const taxonomy = idx('taxonomy') >= 0 ? decodeSqlScalar(fields[idx('taxonomy')]) : null;
        if (taxonomy === 'category') report.authoritative_inventory.categories = (report.authoritative_inventory.categories || 0) + 1;
        if (taxonomy === 'post_tag') report.authoritative_inventory.tags = (report.authoritative_inventory.tags || 0) + 1;
      } else if (parsed.table === tablePrefix + 'postmeta') {
        if (body.includes('_thumbnail_id')) featuredMediaKeySeen = true;
      } else if (parsed.table === tablePrefix + 'options') {
        if (body.includes('permalink_structure')) permalinkKeySeen = true;
      }
    }
  };

  try {
    const rl = readline.createInterface({ input: source, crlfDelay: Infinity });
    for await (const line of rl) {
      const trimmed = line.trimStart();
      if (!mode) {
        if (/^CREATE\s+TABLE/i.test(trimmed)) {
          mode = 'CREATE';
          buffer = line;
        } else if (/^INSERT\s+INTO/i.test(trimmed)) {
          mode = 'INSERT';
          buffer = line;
        } else {
          continue;
        }
      } else {
        buffer += '\n' + line;
      }
      if (/;\s*$/.test(line.trim())) {
        processStatement(buffer);
        mode = null;
        buffer = '';
      }
    }
    if (buffer) processStatement(buffer);
    if (isGzip) report.gzip_integrity = 'PASS';
  } catch {
    if (isGzip) report.gzip_integrity = 'FAIL';
    report.errors.push(safeError(isGzip ? 'GZIP_INTEGRITY_FAILED' : 'SQL_READ_FAILED', isGzip ? 'Gzip stream is corrupt or incomplete.' : 'SQL stream could not be read.'));
    return report;
  }

  const tables = [...schema.keys()].sort();
  prefix = detectPrefix(tables);
  report.wordpress_table_prefix = prefix;
  report.tables = tables;
  report.table_count = tables.length;
  report.estimated_insert_rows_by_table = Object.fromEntries(Object.entries(rowCounts).sort(([a], [b]) => a.localeCompare(b)));
  report.sql_structure_readable = tables.length > 0;

  if (prefix != null) {
    report.missing_expected_core_tables = CORE_SUFFIXES.map(s => prefix + s).filter(t => !schema.has(t));
    report.missing_essential_core_tables = ESSENTIAL_CORE_SUFFIXES.map(s => prefix + s).filter(t => !schema.has(t));
    report.table_groups = classifyTables(tables, prefix);
    report.provenance_signals = buildColumnSignals(schema, prefix);
    report.authoritative_inventory.authors_users = publishedAuthors.size;
    if (report.authoritative_inventory.published_posts == null) report.authoritative_inventory.published_posts = 0;
    if (report.authoritative_inventory.pages == null) report.authoritative_inventory.pages = 0;
    if (report.authoritative_inventory.media == null) report.authoritative_inventory.media = 0;
    if (report.authoritative_inventory.categories == null) report.authoritative_inventory.categories = 0;
    if (report.authoritative_inventory.tags == null) report.authoritative_inventory.tags = 0;
  } else {
    report.errors.push(safeError('WORDPRESS_PREFIX_NOT_DETECTED', 'Could not detect a WordPress table prefix from core schema structures.'));
  }

  const groups = report.table_groups;
  report.commerce_signals.woocommerce_present = Boolean((groups.woocommerce || []).length || shopOrderRowsSeen || shopSubscriptionRowsSeen);
  report.commerce_signals.subscriptions_present = Boolean((groups.subscriptions || []).length || shopSubscriptionRowsSeen);
  report.commerce_signals.memberships_present = Boolean((groups.memberships || []).length);
  report.commerce_signals.payment_tables_present = Boolean((groups.payments || []).length);
  report.content_signals.featured_media_relationships = featuredMediaKeySeen;
  report.content_signals.permalink_structure_key_seen = permalinkKeySeen;
  report.content_signals.shop_order_rows_seen = shopOrderRowsSeen;
  report.content_signals.shop_subscription_rows_seen = shopSubscriptionRowsSeen;

  report.disposable_restore = queryDisposableRestore(options);

  if (!report.sql_structure_readable) {
    report.errors.push(safeError('SQL_STRUCTURE_NOT_DETECTED', 'No CREATE TABLE structures were detected.'));
  }
  if (report.missing_essential_core_tables.length) {
    report.errors.push(safeError('MISSING_ESSENTIAL_WORDPRESS_CORE', 'One or more essential WordPress core tables are missing.'));
  }
  report.validation_status = report.errors.length ? 'INVALID' : 'VALID';
  return report;
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      const report = await validateDatabaseArtifact(path.resolve(args.artifact), args);
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (report.validation_status !== 'VALID') process.exitCode = 2;
    } catch (error) {
      process.stdout.write(JSON.stringify({
        validator: 'wordpress_database',
        validator_version: VALIDATOR_VERSION,
        validation_status: 'INVALID',
        errors: [safeError('VALIDATOR_ARGUMENT_ERROR', error.message === 'ARTIFACT_ARGUMENT_REQUIRED' ? 'Database artifact argument is required.' : 'Database validation could not start.')]
      }, null, 2) + '\n');
      process.exitCode = 2;
    }
  })();
}

module.exports = {
  CORE_SUFFIXES,
  ESSENTIAL_CORE_SUFFIXES,
  VALIDATOR_VERSION,
  buildColumnSignals,
  classifyTables,
  decodeSqlScalar,
  detectPrefix,
  extractValueRows,
  parseCreateStatement,
  parseInsertStatement,
  queryDisposableRestore,
  splitSqlFields,
  validateDatabaseArtifact
};
