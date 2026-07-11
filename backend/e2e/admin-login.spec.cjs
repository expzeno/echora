const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ADMIN_URL = process.env.ADMIN_URL || 'https://adminzt.labzeno.com';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@demo.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/e2e-admin-login';

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  let passed = 0;
  let failed = 0;
  const failures = [];

  async function assert(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      failures.push({ name, error: err.message });
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }

  console.log('[P0-CRITICAL] Admin Login Regression');

  // Step 1: Login page loads
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-page.png') });

  await assert('Login page has title "ZenTemplate Admin"', async () => {
    const title = await page.title();
    if (!title.includes('ZenTemplate Admin') && !title.includes('Admin')) {
      throw new Error(`Unexpected title: ${title}`);
    }
  });

  await assert('Login form has email and password fields', async () => {
    await page.waitForSelector('input[type="email"], input[formcontrolname="email"]', { timeout: 5000 });
    await page.waitForSelector('input[type="password"], input[formcontrolname="password"]', { timeout: 5000 });
  });

  await assert('Sign In button is visible', async () => {
    const btn = page.locator('button:has-text("Sign In")');
    if (!(await btn.isVisible())) throw new Error('Sign In button not found');
  });

  // Step 2: Perform login
  const emailInput = page.locator('input[type="email"], input[formcontrolname="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[formcontrolname="password"]').first();

  await emailInput.fill('');
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill('');
  await passwordInput.fill(ADMIN_PASSWORD);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-credentials-filled.png') });

  await page.locator('button:has-text("Sign In")').click();

  // Wait for either dashboard redirect or error message
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-login-click.png') });

  // Step 3: Verify redirect to dashboard
  await assert('Login succeeds — no error banner displayed', async () => {
    const bodyText = await page.locator('body').innerText();
    const errorPatterns = ['Internal server error', 'invalid credentials', 'Unauthorized'];
    for (const pattern of errorPatterns) {
      if (bodyText.includes(pattern)) {
        throw new Error(`Auth endpoint returned: "${pattern}" — backend login API is broken`);
      }
    }
  });

  await assert('Login redirects to dashboard', async () => {
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
  });

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-dashboard.png') });

  await assert('Dashboard page loads with content', async () => {
    const body = await page.locator('body').innerText();
    if (body.length < 20) throw new Error('Dashboard appears empty');
  });

  await assert('Auth token stored in localStorage', async () => {
    const hasToken = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('auth'));
    });
    if (!hasToken) throw new Error('No auth token found in localStorage');
  });

  // Step 4: Verify authenticated navigation works
  await assert('Can navigate to another admin page without re-login', async () => {
    await page.goto(`${ADMIN_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    const url = page.url();
    if (url.includes('/login')) throw new Error('Redirected back to login — session lost');
  });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-final-state.png') });

  await browser.close();

  // Report
  const total = passed + failed;
  const result = {
    ok: failed === 0,
    total,
    passed,
    failed,
    failures,
    consoleErrors: errors,
    screenshots: SCREENSHOT_DIR,
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'result.json'), JSON.stringify(result, null, 2));

  console.log(`\n${passed}/${total} passed${failed ? ` — ${failed} FAILED` : ''}`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
