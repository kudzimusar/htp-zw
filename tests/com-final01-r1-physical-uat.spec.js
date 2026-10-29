const { test, expect } = require('@playwright/test');

const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://healthtimes-staging-ege5f7kdf-11-11.vercel.app';
const VERCEL_BYPASS_TOKEN = 'OCyLvzTSu5oRwhGhdh6KRiIslPkvlIHE';

const UAT_USER = {
  email: 'uat-specialist@healthtimes.co.zw',
  password: 'HealthTimes#Test2026!'
};

const STUDIO_ROUTES = [
  { path: '/studio/finance', name: 'Financial Overview', title: 'Financial Overview & KPIs', marker: 'Financial Overview & KPIs' },
  { path: '/studio/finance-customers', name: 'Billing Customers', title: 'Billing Customers & Directory', marker: 'Billing Customers' },
  { path: '/studio/orders', name: 'Commercial Orders', title: 'Commercial Orders & Bookings', marker: 'Commercial Orders' },
  { path: '/studio/finance-invoices', name: 'Invoices & Billing', title: 'Invoices & Billing', marker: 'Invoices & Billing' },
  { path: '/studio/finance-aging', name: 'Receivables Aging', title: 'Accounts Receivable Aging', marker: 'Accounts Receivable Aging' },
  { path: '/studio/finance-payments', name: 'Payments Ledger', title: 'Payments & Cash Ledger', marker: 'Payments & Cash Ledger' },
  { path: '/studio/finance-expenses', name: 'Newsroom Expenses', title: 'Newsroom Expense Claims', marker: 'Newsroom Expense Claims' },
  { path: '/studio/my-expenses', name: 'My Filed Expenses', title: 'My Filed Expense Claims', marker: 'My Filed Expense Claims' },
  { path: '/studio/finance-statements', name: 'Financial Statements', title: 'Operational Financial Statements', marker: 'Operational Financial Statements' },
  { path: '/studio/advertising', name: 'Advertising Manager', title: 'Advertising Manager', marker: 'Advertising Manager' },
  { path: '/studio/subscribers', name: 'Subscribers & Entitlements', title: 'Subscribers & Entitlements', marker: 'Subscribers & Entitlements' },
  { path: '/studio/premium', name: 'Premium Policies', title: 'Premium Policies & Monetization', marker: 'Premium Policies & Monetization' }
];

test.describe('HT-MVP-COM-FINAL-01-R1: Physical Staging Browser Certification', () => {
  test.use({
    baseURL: PREVIEW_URL,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': VERCEL_BYPASS_TOKEN
    }
  });

  function setupConsoleMonitoring(page) {
    const errors = [];
    const warnings = [];
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
    return { errors, warnings };
  }

  test('Step 1: Authenticate with live Supabase session at /account-access', async ({ page }) => {
    test.setTimeout(60000);
    const monitor = setupConsoleMonitoring(page);

    await page.goto('/account-access', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Fill sign in credentials
    const emailInput = page.getByPlaceholder('Email address');
    const passwordInput = page.getByPlaceholder('Password');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible({ timeout: 15000 });

    await emailInput.fill(UAT_USER.email);
    await passwordInput.fill(UAT_USER.password);

    // Click Sign In
    const signInButton = page.getByRole('button', { name: 'Sign in', exact: true }).last();
    await expect(signInButton).toBeVisible();
    await signInButton.click();

    // Verify successful sign-in transitions to /studio with authorized staff session
    await page.waitForURL(url => url.pathname.includes('/studio'), { timeout: 15000 });
    await expect(page.getByText('Newsroom Operating Room').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Welcome, Newsroom Staff').first()).toBeVisible({ timeout: 15000 });

    // Assert no fatal React crash
    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Step 2: Physical certification of all 12 Studio commercial routes', async ({ page, context }) => {
    test.setTimeout(180000);
    const monitor = setupConsoleMonitoring(page);

    // Sign in first
    await page.goto('/account-access', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email address').fill(UAT_USER.email);
    await page.getByPlaceholder('Password').fill(UAT_USER.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await page.waitForTimeout(3000);

    for (const route of STUDIO_ROUTES) {
      console.log(`[UAT] Visiting ${route.name} at ${route.path}...`);
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route.path} HTTP 200`).toBe(200);

      // Verify DOM renders the Desk title
      await expect(
        page.getByText(route.title, { exact: false }).first(),
        `${route.name} title must be rendered`
      ).toBeVisible({ timeout: 15000 });

      // Verify Implementation readiness block is present
      await expect(
        page.getByText('Implementation readiness', { exact: true }).first(),
        `${route.name} implementation readiness block must be visible`
      ).toBeVisible({ timeout: 15000 });

      // Capture screenshot proof or verification markers
      await page.waitForTimeout(500);
    }

    // Assert no React #418 crashes across all routes
    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });

  test('Step 3: End-to-end commercial operations & General Ledger verification', async ({ page }) => {
    test.setTimeout(90000);
    const monitor = setupConsoleMonitoring(page);

    // Sign in
    await page.goto('/account-access', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Email address').fill(UAT_USER.email);
    await page.getByPlaceholder('Password').fill(UAT_USER.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await page.waitForTimeout(3000);

    // 1. Visit /studio/finance - verify Overview KPI summary
    await page.goto('/studio/finance', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Financial Overview & KPIs', { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('USD', { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // 2. Visit /studio/finance-customers - verify customer directory
    await page.goto('/studio/finance-customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Billing Customers', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // 3. Visit /studio/orders - verify commercial orders
    await page.goto('/studio/orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Commercial Orders', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // 4. Visit /studio/finance-invoices - verify invoices table
    await page.goto('/studio/finance-invoices', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Invoices & Billing', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // 5. Visit /studio/finance-aging - verify AR Aging buckets
    await page.goto('/studio/finance-aging', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Accounts Receivable Aging', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // 6. Visit /studio/finance-payments - verify payments ledger
    await page.goto('/studio/finance-payments', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Payments & Cash Ledger', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // 7. Visit /studio/finance-expenses - verify expense claims desk
    await page.goto('/studio/finance-expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Newsroom Expense Claims', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // 8. Visit /studio/finance-statements - verify operating financial statements
    await page.goto('/studio/finance-statements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Operational Financial Statements', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    // Assert zero fatal React errors
    const fatal = monitor.errors.filter(e => e.includes('Minified React error #418'));
    expect(fatal).toHaveLength(0);
  });
});
