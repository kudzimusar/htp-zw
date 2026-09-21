const path = require('path');
const fs = require('fs');

const VALIDATOR_VERSION = '1.0.0';

function validateProvenanceReadiness(databaseReport) {
  const gaps = [];
  const signals = databaseReport && databaseReport.provenance_signals || {};
  const content = databaseReport && databaseReport.content_signals || {};
  const commerce = databaseReport && databaseReport.commerce_signals || {};

  if (!databaseReport || databaseReport.validation_status !== 'VALID') gaps.push('authoritative_database_not_valid');
  if (!signals.post_ids) gaps.push('post_page_ids');
  if (!signals.attachment_ids) gaps.push('attachment_ids');
  if (!(signals.post_author_relationship && signals.user_ids)) gaps.push('author_user_ids');
  if (!signals.term_ids) gaps.push('term_ids');
  if (!(signals.term_taxonomy_ids && signals.term_taxonomy_term_relationship)) gaps.push('term_taxonomy_ids');
  if (!(signals.post_slug && signals.post_guid && content.permalink_structure_key_seen)) gaps.push('legacy_urls_permalinks');
  if (!(signals.postmeta_relationship && content.featured_media_relationships)) gaps.push('featured_media_relationships');
  if (!signals.post_parent_relationship) gaps.push('parent_child_relationships');

  if (commerce.woocommerce_present) {
    const hasOrderIdentity = content.shop_order_rows_seen || (databaseReport.table_groups && databaseReport.table_groups.woocommerce || []).some(t => /wc_orders$/i.test(t));
    if (!hasOrderIdentity) gaps.push('woocommerce_order_ids');
  }
  if (commerce.subscriptions_present && !content.shop_subscription_rows_seen && !(databaseReport.table_groups && databaseReport.table_groups.subscriptions || []).length) {
    gaps.push('woocommerce_subscription_ids');
  }
  if (commerce.memberships_present && !(databaseReport.table_groups && databaseReport.table_groups.memberships || []).length) {
    gaps.push('woocommerce_membership_ids');
  }

  return {
    validator: 'provenance_readiness',
    validator_version: VALIDATOR_VERSION,
    validation_timestamp: new Date().toISOString(),
    status: gaps.length ? 'PROVENANCE_GAPS' : 'PROVENANCE_READY',
    gaps: [...new Set(gaps)].sort()
  };
}

if (require.main === module) {
  try {
    const argIndex = process.argv.indexOf('--database-report');
    if (argIndex < 0 || !process.argv[argIndex + 1]) throw new Error('INPUT_REQUIRED');
    const report = JSON.parse(fs.readFileSync(path.resolve(process.argv[argIndex + 1]), 'utf8'));
    const result = validateProvenanceReadiness(report);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.status !== 'PROVENANCE_READY') process.exitCode = 4;
  } catch {
    process.stdout.write(JSON.stringify({
      validator: 'provenance_readiness',
      validator_version: VALIDATOR_VERSION,
      status: 'PROVENANCE_GAPS',
      gaps: ['authoritative_database_report_unavailable']
    }, null, 2) + '\n');
    process.exitCode = 4;
  }
}

module.exports = { VALIDATOR_VERSION, validateProvenanceReadiness };
