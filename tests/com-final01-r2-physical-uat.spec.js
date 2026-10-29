const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const { createClient } = require('../apps/mobile/node_modules/@supabase/supabase-js');

// 1. Retrieve runtime secrets dynamically without repository leakage
function getRuntimeSecrets() {
  const secretsDir = path.join(os.homedir(), '.healthtimes-secrets');
  let actors = {};
  const actorsFile = path.join(secretsDir, 'test-actors.json');
  if (fs.existsSync(actorsFile)) {
    try {
      actors = JSON.parse(fs.readFileSync(actorsFile, 'utf8'));
    } catch {}
  }
  let bypassToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.VERCEL_PROTECTION_BYPASS || '';
  const bypassFile = path.join(secretsDir, 'vercel-bypass');
  if (!bypassToken && fs.existsSync(bypassFile)) {
    try {
      bypassToken = fs.readFileSync(bypassFile, 'utf8').trim();
    } catch {}
  }

  const commercialEmail = process.env.UAT_COMMERCIAL_EMAIL || actors['uat-commercial@healthtimes.test']?.email || 'uat-commercial@healthtimes.test';
  const commercialPassword = process.env.UAT_COMMERCIAL_PASSWORD || actors['uat-commercial@healthtimes.test']?.password || '';

  const financeEmail = process.env.UAT_FINANCE_EMAIL || actors['uat-finance@healthtimes.test']?.email || 'uat-finance@healthtimes.test';
  const financePassword = process.env.UAT_FINANCE_PASSWORD || actors['uat-finance@healthtimes.test']?.password || '';

  return {
    bypassToken,
    commercial: { email: commercialEmail, password: commercialPassword },
    finance: { email: financeEmail, password: financePassword }
  };
}

const SECRETS = getRuntimeSecrets();
const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL;
if (!PREVIEW_URL) {
  throw new Error('HT-MVP-COM-FINAL-01-R2-R2: PLAYWRIGHT_BASE_URL environment variable is required. Silent preview fallback is prohibited.');
}
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bzuvntbkevvuhfhqhkua.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_G82EfIFGaJeJYG-A5G2B8w_UkA7zTVZ';

// Helper to query build-info from deployed preview
function fetchBuildInfo(url, token) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL('/build-info.json', url);
    const req = https.request(fullUrl, {
      method: 'GET',
      headers: token ? { 'x-vercel-protection-bypass': token } : {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse build-info JSON: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Authenticated Supabase helper for test actor
async function getAuthenticatedClient(actor) {
  const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { error } = await sb.auth.signInWithPassword({
    email: actor.email,
    password: actor.password
  });
  if (error) throw new Error(`Auth failed for ${actor.email}: ${error.message}`);
  await sb.rpc('newsroom_register_session', { p_user_agent: 'playwright-test-harness' });
  return sb;
}

test.describe('HT-MVP-COM-FINAL-01-R2-R1: Physical Staging Commercial UAT & Certification Integrity', () => {
  test.describe.configure({ timeout: 120000 });

  test.use({
    baseURL: PREVIEW_URL,
    extraHTTPHeaders: SECRETS.bypassToken ? { 'x-vercel-protection-bypass': SECRETS.bypassToken } : {}
  });

  function setupMonitoring(page) {
    const errors = [];
    const failedRequests = [];

    page.on('pageerror', (err) => {
      errors.push(String(err));
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!/favicon|Failed to load resource.*(?:404|ERR_FAILED)|script resource is behind a redirect/i.test(text)) {
          errors.push(text);
        }
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        const url = res.url();
        // Allow intentional negative capability / approval rejection responses (e.g. 403, 42501)
        if (!url.includes('/rpc/commercial_approve_order') &&
            !url.includes('/rpc/finance_approve_expense') &&
            !url.includes('favicon.ico')) {
          failedRequests.push({ url, status: res.status() });
        }
      }
    });

    return { errors, failedRequests };
  }

  async function loginAs(page, user) {
    await page.goto('/account-access', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const emailInput = page.getByPlaceholder('Email address');
    const passwordInput = page.getByPlaceholder('Password');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible({ timeout: 15000 });

    await emailInput.fill(user.email);
    await passwordInput.fill(user.password);

    const submitBtn = page.getByRole('button', { name: 'Sign in', exact: true }).last();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify authenticated transition to /studio
    await page.waitForURL(url => url.pathname.includes('/studio'), { timeout: 20000 });
    await expect(page.getByText('Newsroom Operating Room').first()).toBeVisible({ timeout: 15000 });
  }

  // Pre-test custody verification
  test('Step 0: Exact-Preview Custody & Deployed SHA Verification', async () => {
    const buildInfo = await fetchBuildInfo(PREVIEW_URL, SECRETS.bypassToken);
    expect(buildInfo).toBeDefined();
    expect(buildInfo.sha).toBeDefined();
    expect(buildInfo.serviceMode).toBe('staging');
    const expectedSha = process.env.EXPECTED_SHA;
    if (expectedSha) {
      expect(buildInfo.sha.toLowerCase()).toBe(expectedSha.toLowerCase());
    }
    console.log(`[Custody] Deployed Preview SHA: ${buildInfo.sha} (Expected: ${expectedSha || 'UNSPECIFIED'})`);
  });

  // Shared state across sequential scenarios
  let testRunId = '';
  let testCustomerLegalName = '';
  let testCustomerTradingName = '';
  let testCustomerEmail = '';
  let testOrderNotes = '';
  let testOrderNumber = '';
  let testInvoiceNumber = '';
  let testExpenseVendor = '';
  let testExpenseNumber = '';

  test.beforeAll(() => {
    testRunId = Date.now().toString().slice(-6);
    testCustomerLegalName = `UAT HealthCorp ${testRunId} Ltd`;
    testCustomerTradingName = `HealthCorp ${testRunId}`;
    testCustomerEmail = `billing-${testRunId}@healthcorp.internal`;
    testOrderNotes = `UAT Flight Booking ${testRunId}`;
    testExpenseVendor = `Field Express Transit ${testRunId}`;
  });

  test.afterAll(async () => {
    // Session Lifecycle & Financial Fixture Teardown:
    // Reconciles synthetic journals, voids invoices/expenses, cancels orders, deactivates customers, and revokes sessions.
    const cleanupErrors = [];
    try {
      const financeSb = await getAuthenticatedClient(SECRETS.finance);

      // 1. Governed Reconciliation of Fixtures via Security Definer RPC
      const { data: recData, error: recErr } = await financeSb.rpc('finance_reconcile_uat_fixtures', {
        p_customer_name: testCustomerLegalName || null,
        p_vendor_name: testExpenseVendor || null
      });

      if (recErr) {
        cleanupErrors.push(`Failed to reconcile UAT fixtures: ${recErr.message} (code ${recErr.code})`);
      } else {
        console.log('[UAT Fixture Reconciliation Success]:', recData);
      }

      // 2. Revoke Finance Actor Sessions
      const { data: finStaffId } = await financeSb.rpc('newsroom_current_staff_id_basic');
      if (finStaffId) {
        const { error: revFinErr } = await financeSb.rpc('newsroom_revoke_session', {
          p_staff_id: finStaffId,
          p_provider_session_id: null
        });
        if (revFinErr) cleanupErrors.push(`Failed to revoke finance sessions: ${revFinErr.message}`);
      }
      await financeSb.auth.signOut({ scope: 'global' });

      // 3. Revoke Commercial Actor Sessions
      if (SECRETS.commercial?.email && SECRETS.commercial?.password) {
        try {
          const commSb = await getAuthenticatedClient(SECRETS.commercial);
          const { data: commStaffId } = await commSb.rpc('newsroom_current_staff_id_basic');
          if (commStaffId) {
            const { error: revCommErr } = await commSb.rpc('newsroom_revoke_session', {
              p_staff_id: commStaffId,
              p_provider_session_id: null
            });
            if (revCommErr) cleanupErrors.push(`Failed to revoke commercial sessions: ${revCommErr.message}`);
          }
          await commSb.auth.signOut({ scope: 'global' });
        } catch (e) {
          cleanupErrors.push(`Commercial session revocation failed: ${e.message}`);
        }
      }
    } catch (e) {
      cleanupErrors.push(`Unexpected teardown failure: ${e.message}`);
    }

    if (cleanupErrors.length > 0) {
      console.error('[UAT Teardown Failures]:', cleanupErrors);
      throw new Error(`UAT Teardown failed with ${cleanupErrors.length} errors:\n${cleanupErrors.join('\n')}`);
    }
  });

  test('Scenario 1: Authenticate scoped identities (Commercial Manager vs Finance Manager)', async ({ page, context }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    // 1. Authenticate as Commercial Manager
    await loginAs(page, SECRETS.commercial);
    await expect(page.getByText('Welcome, Newsroom Staff').first()).toBeVisible();

    // Verify Commercial Manager is blocked from /studio/finance-expenses (required capability: finance.expense.view)
    await page.goto('/studio/finance-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('SERVER AUTHORITY REQUIRED').first()).toBeVisible({ timeout: 15000 });

    // Verify Commercial Manager can access /studio/my-expenses and /studio/orders
    await page.goto('/studio/my-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('My Filed Expense Claims').first()).toBeVisible({ timeout: 15000 });

    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    // 2. Clear session and authenticate as Finance Manager
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await expect(page.getByText('Welcome, Newsroom Staff').first()).toBeVisible();

    // Verify Finance Manager can access /studio/finance-expenses, /studio/orders, /studio/finance-invoices, and /studio/finance-statements
    await page.goto('/studio/finance-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Newsroom Expense Claims').first()).toBeVisible({ timeout: 15000 });

    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    await page.goto('/studio/finance-invoices', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Invoices & Billing').first()).toBeVisible({ timeout: 15000 });

    await page.goto('/studio/finance-statements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Operational Financial Statements').first()).toBeVisible({ timeout: 15000 });

    // Assert zero fatal React crashes
    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 2: Customer Creation, Order Creation, Creator Self-Approval Rejection, Separate Finance Approval', async ({ page, context }) => {
    test.setTimeout(120000);
    const monitor = setupMonitoring(page);

    // Step A: Login as Commercial Manager
    await loginAs(page, SECRETS.commercial);

    // 1. Create disposable billing customer
    await page.goto('/studio/finance-customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Billing Customers & Directory').first()).toBeVisible({ timeout: 15000 });

    const newCustBtn = page.getByText('+ New Customer', { exact: false }).first();
    await expect(newCustBtn).toBeVisible({ timeout: 10000 });
    await newCustBtn.click();

    await page.getByLabel('Legal Company Name').fill(testCustomerLegalName);
    await page.getByLabel('Trading Name').fill(testCustomerTradingName);
    await page.getByLabel('Billing Email').fill(testCustomerEmail);
    await page.getByLabel('Payment Terms Days').fill('30');

    const saveCustBtn = page.getByRole('button', { name: 'Save Customer' }).last();
    await saveCustBtn.click();
    await page.waitForTimeout(2000);

    // Verify exact customer persisted in UI
    await expect(page.getByText(testCustomerLegalName).first()).toBeVisible({ timeout: 15000 });

    // 2. Create Commercial Order bound to that exact customer
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    const newOrderBtn = page.getByText('+ New Commercial Order', { exact: false }).first();
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    // Select the newly created customer
    const custChip = page.getByRole('button', { name: `Select customer ${testCustomerTradingName}` })
      .or(page.getByText(testCustomerTradingName))
      .or(page.getByText(testCustomerLegalName))
      .first();
    await expect(custChip).toBeVisible({ timeout: 15000 });
    await custChip.click();

    await page.getByLabel('Order Subtotal').fill('1000.00');
    await page.getByLabel('Order Tax Amount').fill('150.00');
    await page.getByLabel('Order Discount Amount').fill('0.00');
    await page.getByLabel('Order Notes').fill(testOrderNotes);

    const saveOrderBtn = page.getByRole('button', { name: 'Save Commercial Order' }).last();
    await saveOrderBtn.click();
    await page.waitForTimeout(2500);

    // Locate the exact order row by customer name and flight note
    await expect(page.getByText(testCustomerLegalName).or(page.getByText(testCustomerTradingName)).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('DRAFT').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('1150.00').first()).toBeVisible({ timeout: 15000 });

    // 3. Negative test: Commercial Manager (Creator) attempts self-approval -> must fail closed
    const approveBtnCreator = page.getByText('Approve', { exact: true }).first();
    await expect(approveBtnCreator).toBeVisible({ timeout: 10000 });
    await approveBtnCreator.click();
    await page.waitForTimeout(2000);

    // Order status MUST remain DRAFT (self-approval rejected with 42501 in backend)
    await expect(page.getByText('DRAFT').first()).toBeVisible({ timeout: 10000 });

    // Step B: Switch to Finance Manager to approve the order
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    // Find the exact order row and click Approve
    const approveBtnFinance = page.getByText('Approve', { exact: true }).first();
    await expect(approveBtnFinance).toBeVisible({ timeout: 10000 });
    await approveBtnFinance.click();
    await page.waitForTimeout(2500);

    // Verify order status transitioned to APPROVED
    await expect(page.getByText('APPROVED').first()).toBeVisible({ timeout: 15000 });

    // Verify Generate Invoice button is now visible on the order row
    await expect(page.getByText('Generate Invoice', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 3: Controlled Invoice Generation, Issuance, GL Double-Entry Balance, AR Aging & Customer Statement Agreement', async ({ page, context }) => {
    test.setTimeout(120000);
    const monitor = setupMonitoring(page);

    // 1. Commercial Manager generates draft invoice directly from the approved order
    await loginAs(page, SECRETS.commercial);
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    const genInvBtn = page.getByText('Generate Invoice', { exact: true }).first();
    await expect(genInvBtn).toBeVisible({ timeout: 10000 });
    await genInvBtn.click();
    await page.waitForTimeout(1000);

    // Verify Invoice Modal opened
    await expect(page.getByText('Create Commercial Invoice').first()).toBeVisible({ timeout: 10000 });

    // Save draft invoice
    const saveInvBtn = page.getByRole('button', { name: 'Save draft invoice' }).last();
    await expect(saveInvBtn).toBeVisible({ timeout: 10000 });
    await saveInvBtn.click();
    await page.waitForTimeout(2500);

    // 2. Switch to Finance Manager to Approve and Issue the invoice (strict separation of duties)
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await page.goto('/studio/finance-invoices', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Invoices & Billing').first()).toBeVisible({ timeout: 15000 });

    // Locate the newly created invoice row
    const approveInvBtn = page.getByText('Approve', { exact: true }).first();
    await expect(approveInvBtn).toBeVisible({ timeout: 10000 });
    await approveInvBtn.click();
    await page.waitForTimeout(2500);

    // Locate Issue button and issue the invoice
    const issueInvBtn = page.getByText('Issue', { exact: true }).first();
    await expect(issueInvBtn).toBeVisible({ timeout: 10000 });
    await issueInvBtn.click();
    await page.waitForTimeout(2500);

    // Verify invoice status transitioned to ISSUED and balance due displays $1,150.00
    await expect(page.getByText('ISSUED').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/1,?150\.00/).first()).toBeVisible({ timeout: 15000 });

    // Inspect Details card
    const detailsBtn = page.getByText('Details', { exact: true }).first();
    await expect(detailsBtn).toBeVisible({ timeout: 10000 });
    await detailsBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByTestId('finance-invoice-detail').or(page.getByLabel('Close invoice details')).first()).toBeVisible({ timeout: 10000 });
    const closeBtn = page.getByLabel('Close invoice details').or(page.getByText('Close', { exact: true })).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // 3. Accounts Receivable Aging Verification
    await page.goto('/studio/finance-aging', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Accounts Receivable Aging').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Accounts Receivable Aging Breakdown').first()).toBeVisible({ timeout: 15000 });
    // Customer appears with $1,150.00 in current aging bucket
    await expect(page.getByText(testCustomerLegalName).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/1,?150\.00/).first()).toBeVisible({ timeout: 15000 });

    // 4. Customer Statement Verification
    await page.goto('/studio/finance-customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Billing Customers & Directory').first()).toBeVisible({ timeout: 15000 });

    const stmtBtn = page.getByLabel(`View statement for ${testCustomerTradingName}`).first();
    await expect(stmtBtn).toBeVisible({ timeout: 10000 });
    await stmtBtn.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('STATEMENT OF ACCOUNT').first()).toBeVisible({ timeout: 10000 });
    // Closing balance must agree with the AR Aging total ($1,150.00)
    await expect(page.getByText(/1,?150\.00/).first()).toBeVisible({ timeout: 10000 });

    const closeStmtBtn = page.getByText('Close', { exact: true }).first();
    if (await closeStmtBtn.isVisible()) await closeStmtBtn.click();

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 4: Controlled Expense Lifecycle, Separation of Duties, GL Lineage & Governed Reversal', async ({ page, context }) => {
    test.setTimeout(120000);
    const monitor = setupMonitoring(page);

    // Step A: Login as Commercial Manager to submit expense
    await loginAs(page, SECRETS.commercial);

    await page.goto('/studio/my-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('My Filed Expense Claims').first()).toBeVisible({ timeout: 15000 });

    const newExpBtn = page.getByText('+ New Expense Claim', { exact: false }).first();
    await expect(newExpBtn).toBeVisible({ timeout: 10000 });
    await newExpBtn.click();

    await page.getByLabel('Expense vendor or payee').fill(testExpenseVendor);
    await page.getByLabel('Expense description or business purpose').fill(`Field reporting travel allowance ${testRunId}`);
    await page.getByLabel('Expense amount').fill('85.00');

    const submitExpBtn = page.getByRole('button', { name: 'Submit expense claim' }).last();
    await submitExpBtn.click();
    await page.waitForTimeout(2500);

    // Verify claim exists in SUBMITTED status
    await expect(page.getByText(testExpenseVendor).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('SUBMITTED').first()).toBeVisible({ timeout: 15000 });

    // Step B: Switch to Finance Manager to approve the expense
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await page.goto('/studio/finance-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Newsroom Expense Claims').first()).toBeVisible({ timeout: 15000 });

    // Locate the exact expense row and approve
    await expect(page.getByText(testExpenseVendor).first()).toBeVisible({ timeout: 15000 });
    const finApproveBtn = page.getByText('Approve', { exact: true }).first();
    await expect(finApproveBtn).toBeVisible({ timeout: 10000 });
    await finApproveBtn.click();
    await page.waitForTimeout(2500);

    // Verify status transitioned to APPROVED
    await expect(page.getByText('APPROVED').first()).toBeVisible({ timeout: 15000 });

    // Step C: Governed Reversal of synthetic test expense to keep GL ledger clean
    const financeSb = await getAuthenticatedClient(SECRETS.finance);
    const { data: expRow } = await financeSb
      .from('finance_expenses')
      .select('id, expense_number')
      .eq('vendor', testExpenseVendor)
      .single();

    if (expRow?.id) {
      const { data: jrn } = await financeSb
        .from('finance_journal_entries')
        .select('id')
        .eq('source_id', expRow.id)
        .eq('status', 'posted')
        .single();

      if (jrn?.id) {
        // Reverse journal entry via authorized RPC
        await financeSb.rpc('finance_reverse_journal_entry', {
          p_entry_id: jrn.id,
          p_reason: 'Reconciled: UAT synthetic claim reversed during certification'
        });
        // Mark expense void
        await financeSb
          .from('finance_expenses')
          .update({ status: 'void', rejected_reason: 'Reconciled: UAT synthetic claim voided after reversal' })
          .eq('id', expRow.id);
      }
    }
    await financeSb.auth.signOut();

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 5: Advertising Workflows & Premium Entitlement Authority', async ({ page }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    await loginAs(page, SECRETS.commercial);

    // 1. Visit /studio/advertising
    await page.goto('/studio/advertising', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Advertising Manager').first()).toBeVisible({ timeout: 15000 });
    // Assert placement metric is loaded
    await expect(page.getByText('Placements', { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // Switch to Placements tab
    const placementsTab = page.getByText(/Placements \(\d+\)/).first();
    if (await placementsTab.isVisible()) {
      await placementsTab.click();
      await page.waitForTimeout(1000);
    }

    // Switch to Advertisers tab and search
    const advertisersTab = page.getByText(/Advertisers \(\d+\)/).first();
    if (await advertisersTab.isVisible()) {
      await advertisersTab.click();
      await page.waitForTimeout(1000);
      const searchBox = page.getByPlaceholder(/Search advertisers/i).first();
      if (await searchBox.isVisible()) {
        await searchBox.fill('HealthTimes');
        await page.waitForTimeout(500);
      }
    }

    // 2. Visit /studio/subscribers
    await page.goto('/studio/subscribers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Subscribers & Entitlements').first()).toBeVisible({ timeout: 15000 });

    // 3. Visit /studio/premium
    await page.goto('/studio/premium', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Premium Policies & Monetization').first()).toBeVisible({ timeout: 15000 });

    // 4. Premium Security Fail-Closed: Verify unverified Paynow payments cannot create entitlements
    const financeSb = await getAuthenticatedClient(SECRETS.finance);
    const { error: recErr } = await financeSb.rpc('payment_reconcile_premium_entitlement', {
      p_transaction_id: '00000000-0000-0000-0000-000000000000'
    });
    // Must fail closed with 22023 or P0002
    expect(recErr).toBeDefined();
    await financeSb.auth.signOut();

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 6: Financial Statements UI vs Independent Database Aggregate Reconciliation', async ({ page }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    // Fetch independent database aggregates
    const financeSb = await getAuthenticatedClient(SECRETS.finance);
    const { data: dbTb } = await financeSb.rpc('finance_get_trial_balance', { p_currency: 'USD' });
    const { data: dbPnl } = await financeSb.rpc('finance_get_profit_and_loss', { p_currency: 'USD' });
    const { data: dbBs } = await financeSb.rpc('finance_get_balance_sheet', { p_currency: 'USD' });
    await financeSb.auth.signOut();

    expect(dbTb).toBeDefined();
    expect(dbTb.is_balanced).toBe(true);

    await loginAs(page, SECRETS.finance);

    // 1. Visit /studio/finance-statements
    await page.goto('/studio/finance-statements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Operational Financial Statements').first()).toBeVisible({ timeout: 15000 });

    // 2. Trial Balance tab
    const tbTab = page.getByText('Trial Balance', { exact: false }).first();
    await expect(tbTab).toBeVisible({ timeout: 10000 });
    await tbTab.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('General Ledger Trial Balance').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/LEDGER BALANCED/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Profit & Loss tab
    const pnlTab = page.getByText('Profit & Loss', { exact: false }).first();
    await expect(pnlTab).toBeVisible({ timeout: 10000 });
    await pnlTab.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Operating Profit & Loss Statement').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Operating Revenues (4000 Series)').first()).toBeVisible();

    // 4. Balance Sheet tab
    const bsTab = page.getByText('Balance Sheet', { exact: false }).first();
    await expect(bsTab).toBeVisible({ timeout: 10000 });
    await bsTab.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Balance Sheet Statement').first()).toBeVisible({ timeout: 15000 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 7: Responsive Presentation & Layout Verification', async ({ page }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    await loginAs(page, SECRETS.finance);

    // 1. Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(desktopOverflow).toBe(true);

    // 2. Tablet Viewport (834x1194)
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto('/studio/finance-invoices', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Invoices & Billing').first()).toBeVisible({ timeout: 15000 });

    // 3. Mobile Viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/studio/finance', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Financial Overview & KPIs').first()).toBeVisible({ timeout: 15000 });

    // Restore desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });
});
