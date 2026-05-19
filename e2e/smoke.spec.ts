/**
 * E2E smoke spec — run with Playwright when the stack is up:
 *   npx playwright test e2e/smoke.spec.ts
 *
 * Set E2E_API_URL and E2E_APP_URL in the environment for CI.
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:5000/api';
const APP_URL = process.env.E2E_APP_URL || 'http://localhost:3000';

test.describe('Rapid Grow MVP smoke', () => {
  test('gateway health responds', async ({ request }) => {
    const base = API_URL.replace(/\/api\/?$/, '');
    const res = await request.get(`${base}/health`);
    expect(res.ok()).toBeTruthy();
  });

  test('login page loads', async ({ page }) => {
    await page.goto(`${APP_URL}/#/`);
    await expect(page.getByText('Rapid Grow Admin Portal')).toBeVisible();
  });

  test('signup route loads', async ({ page }) => {
    await page.goto(`${APP_URL}/#/signup`);
    await expect(page.getByText(/workspace|company/i)).toBeVisible();
  });

  test('forgot password route loads', async ({ page }) => {
    await page.goto(`${APP_URL}/#/password/forgot`);
    await expect(page.getByText('Reset your password')).toBeVisible();
  });

  test('invite accept route loads without token', async ({ page }) => {
    await page.goto(`${APP_URL}/#/invite/accept`);
    await expect(page.getByText(/invite|workspace/i)).toBeVisible();
  });
});
