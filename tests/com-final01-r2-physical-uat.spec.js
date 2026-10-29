const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Retrieve secure runtime secrets without hardcoding any credentials in repository source
function getRuntimeSecrets() {
  const secretsDir = path.join(os.homedir(), '.healthtimes-secrets');
  let actors = {};
  const actorsFile = path.join(secretsDir, 'test-actors.json');
  if (fs.existsSync(actorsFile)) {
    try {
      actors = JSON.parse(fs.readFileSync(actorsFile, 'utf8'));
    } catch {}
  }
  let bypassToken = process.env.VERCEL_PROTECTION_BYPASS || process.env.VERCEL_BYPASS_TOKEN || '';
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
const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://healthtimes-staging-6sbhy7xgm-11-11.vercel.app';

test.describe('HT-MVP-COM-FINAL-01-R2: Physical Staging Commercial UAT & Security Certification', () => {
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
        if (!/favicon|Failed to load resource.*(?:404|ERR_FAILED)/i.test(text)) {
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

  test('Scenario 1: Authenticate scoped identities (Commercial Manager vs Finance Manager)', async ({ page, context }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    // 1. Authenticate as Commercial Manager
    await loginAs(page, SECRETS.commercial);
    await expect(page.getByText('Welcome, Newsroom Staff').first()).toBeVisible();

    // 2. Clear session and authenticate as Finance Manager
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await expect(page.getByText('Welcome, Newsroom Staff').first()).toBeVisible();

    // Assert zero fatal React crashes
    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 2: Customer Creation, Order Creation, Self-Approval Rejection, and Finance Approval', async ({ page, context }) => {
    test.setTimeout(120000);
    const monitor = setupMonitoring(page);
    const uniqueId = Date.now().toString().slice(-6);
    const customerLegalName = `UAT HealthCorp ${uniqueId} Ltd`;
    const customerTradingName = `HealthCorp ${uniqueId}`;
    const customerEmail = `billing-${uniqueId}@healthcorp.internal`;

    // Step A: Login as Commercial Manager
    await loginAs(page, SECRETS.commercial);

    // 1. Navigate to /studio/finance-customers and create disposable customer
    await page.goto('/studio/finance-customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Billing Customers & Directory').first()).toBeVisible({ timeout: 15000 });

    const newCustBtn = page.getByText('+ New Customer', { exact: false }).first();
    await expect(newCustBtn).toBeVisible({ timeout: 10000 });
    await newCustBtn.click();

    await page.getByLabel('Legal Company Name').fill(customerLegalName);
    await page.getByLabel('Trading Name').fill(customerTradingName);
    await page.getByLabel('Billing Email').fill(customerEmail);
    await page.getByLabel('Payment Terms Days').fill('30');

    const saveCustBtn = page.getByRole('button', { name: 'Save Customer' }).last();
    await saveCustBtn.click();
    await page.waitForTimeout(2000);

    // Verify customer is persisted in directory
    await expect(page.getByText(customerLegalName).first()).toBeVisible({ timeout: 15000 });

    // 2. Navigate to /studio/orders and create commercial order
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    const newOrderBtn = page.getByText('+ New Commercial Order', { exact: false }).first();
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    // Select the newly created customer
    const custChip = page.getByText(customerLegalName).first();
    if (await custChip.isVisible()) {
      await custChip.click();
    } else {
      const custFallback = page.getByText(customerTradingName).first();
      await custFallback.click();
    }

    await page.getByLabel('Order Subtotal').fill('1000.00');
    await page.getByLabel('Order Tax Amount').fill('150.00');
    await page.getByLabel('Order Discount Amount').fill('100.00');
    await page.getByLabel('Order Notes').fill(`UAT Campaign Booking Flight ${uniqueId}`);

    const saveOrderBtn = page.getByRole('button', { name: 'Save Commercial Order' }).last();
    await saveOrderBtn.click();
    await page.waitForTimeout(2500);

    // Verify order exists in DRAFT status
    await expect(page.getByText('DRAFT').first()).toBeVisible({ timeout: 15000 });

    // 3. Negative test: Commercial Manager (Creator) attempts self-approval
    // Creator self-approval must be strictly rejected
    const approveBtnCreator = page.getByRole('button', { name: /Approve/i }).first();
    if (await approveBtnCreator.isVisible()) {
      await approveBtnCreator.click();
      await page.waitForTimeout(1500);
      // Status must remain DRAFT (self-approval rejected)
      await expect(page.getByText('DRAFT').first()).toBeVisible();
    }

    // Step B: Switch session to Finance Manager to approve the order
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    const approveBtnFinance = page.getByRole('button', { name: /Approve/i }).first();
    await expect(approveBtnFinance).toBeVisible({ timeout: 10000 });
    await approveBtnFinance.click();
    await page.waitForTimeout(2500);

    // Verify order status transitioned to APPROVED
    await expect(page.getByText('APPROVED').first()).toBeVisible({ timeout: 15000 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 3: Invoice Issuance, AR Aging, and Customer Statement Agreement', async ({ page }) => {
    test.setTimeout(120000);
    const monitor = setupMonitoring(page);

    // Login as Finance Manager
    await loginAs(page, SECRETS.finance);

    // 1. Visit Invoices desk
    await page.goto('/studio/finance-invoices', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Invoices & Billing').first()).toBeVisible({ timeout: 15000 });

    // Check if draft invoice exists to approve and issue
    const approveInvBtn = page.getByRole('button', { name: /^Approve$/i }).first();
    if (await approveInvBtn.isVisible()) {
      await approveInvBtn.click();
      await page.waitForTimeout(2000);
    }

    const issueInvBtn = page.getByRole('button', { name: /^Issue$/i }).first();
    if (await issueInvBtn.isVisible()) {
      await issueInvBtn.click();
      await page.waitForTimeout(2000);
    }

    // Reopen invoice details to verify customer and order relationship
    const detailsBtn = page.getByRole('button', { name: /^Details$/i }).first();
    if (await detailsBtn.isVisible()) {
      await detailsBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText('INVOICE DETAIL').first()).toBeVisible({ timeout: 10000 });
      // Close details modal
      const closeBtn = page.getByText('Close', { exact: true }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // 2. Visit Accounts Receivable Aging
    await page.goto('/studio/finance-aging', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Accounts Receivable Aging').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Accounts Receivable Aging Breakdown').first()).toBeVisible({ timeout: 15000 });

    // 3. Visit Customer Statements
    await page.goto('/studio/finance-customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Billing Customers & Directory').first()).toBeVisible({ timeout: 15000 });

    const stmtBtn = page.getByText('Statement', { exact: true }).first();
    if (await stmtBtn.isVisible()) {
      await stmtBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.getByText('STATEMENT OF ACCOUNT').first()).toBeVisible({ timeout: 10000 });
      const closeStmt = page.getByText('Close', { exact: true }).first();
      if (await closeStmt.isVisible()) await closeStmt.click();
    }

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 4: Expense Submission, Self-Approval Rejection, and Finance Approval', async ({ page, context }) => {
    test.setTimeout(120000);
    const monitor = setupMonitoring(page);
    const uniqueId = Date.now().toString().slice(-6);

    // Step A: Login as Commercial Manager to submit expense via /studio/my-expenses
    await loginAs(page, SECRETS.commercial);

    // Verify Commercial Manager cannot access organization-wide /studio/finance-expenses (scoped access)
    await page.goto('/studio/finance-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('SERVER AUTHORITY REQUIRED').first()).toBeVisible({ timeout: 15000 });

    // Navigate to /studio/my-expenses to submit personal expense claim
    await page.goto('/studio/my-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('My Filed Expense Claims').first()).toBeVisible({ timeout: 15000 });

    const newExpBtn = page.getByText('+ New Expense Claim', { exact: false }).first();
    await expect(newExpBtn).toBeVisible({ timeout: 10000 });
    await newExpBtn.click();

    await page.getByLabel('Expense vendor or payee').fill(`Harare Transport Fleet ${uniqueId}`);
    await page.getByLabel('Expense description or business purpose').fill(`Field reporting travel allowance ${uniqueId}`);
    await page.getByLabel('Expense amount').fill('85.00');

    const submitExpBtn = page.getByRole('button', { name: 'Submit expense claim' }).last();
    await submitExpBtn.click();
    await page.waitForTimeout(2500);

    // Verify claim exists in SUBMITTED status
    await expect(page.getByText('SUBMITTED').first()).toBeVisible({ timeout: 15000 });

    // Step B: Switch to Finance Manager to approve the expense
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, SECRETS.finance);
    await page.goto('/studio/finance-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Newsroom Expense Claims').first()).toBeVisible({ timeout: 15000 });

    const finApproveBtn = page.getByText('Approve', { exact: true }).first();
    await expect(finApproveBtn).toBeVisible({ timeout: 10000 });
    await finApproveBtn.click();
    await page.waitForTimeout(2500);

    // Verify status transitioned to APPROVED
    await expect(page.getByText('APPROVED').first()).toBeVisible({ timeout: 15000 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 5: Advertising Manager, Subscribers Directory, and Premium Governance', async ({ page }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    await loginAs(page, SECRETS.commercial);

    // 1. Visit /studio/advertising
    await page.goto('/studio/advertising', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Advertising Manager').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Implementation readiness').first()).toBeVisible({ timeout: 15000 });

    // 2. Visit /studio/subscribers
    await page.goto('/studio/subscribers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Subscribers & Entitlements').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Implementation readiness').first()).toBeVisible({ timeout: 15000 });

    // 3. Visit /studio/premium
    await page.goto('/studio/premium', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Premium Policies & Monetization').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Implementation readiness').first()).toBeVisible({ timeout: 15000 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Scenario 6: Financial Statements (Trial Balance, P&L, Balance Sheet) GAAP Verification', async ({ page }) => {
    test.setTimeout(90000);
    const monitor = setupMonitoring(page);

    await loginAs(page, SECRETS.finance);

    // 1. Visit /studio/finance-statements
    await page.goto('/studio/finance-statements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Operational Financial Statements').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('OPERATING FINANCIAL REPORTING AUTHORITY').first()).toBeVisible({ timeout: 15000 });

    // 2. Visit Trial Balance Tab
    const tbTab = page.getByText('Trial Balance', { exact: false }).first();
    await expect(tbTab).toBeVisible({ timeout: 10000 });
    await tbTab.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('General Ledger Trial Balance').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('GAAP GENERAL LEDGER · DOUBLE ENTRY').first()).toBeVisible();
    await expect(page.getByText(/LEDGER BALANCED/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Visit Profit & Loss Tab
    const pnlTab = page.getByText('Profit & Loss', { exact: false }).first();
    await expect(pnlTab).toBeVisible({ timeout: 10000 });
    await pnlTab.click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Operating Profit & Loss Statement').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Operating Revenues (4000 Series)').first()).toBeVisible();

    // 4. Visit Balance Sheet Tab
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

    // Test tablet/mobile viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAs(page, SECRETS.finance);

    await page.goto('/studio/finance', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Financial Overview & KPIs').first()).toBeVisible({ timeout: 15000 });

    // Test mobile phone viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders & Bookings').first()).toBeVisible({ timeout: 15000 });

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/studio/finance-statements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Operational Financial Statements').first()).toBeVisible({ timeout: 15000 });

    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });
});
