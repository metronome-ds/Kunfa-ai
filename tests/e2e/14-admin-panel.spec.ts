import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.admin, TEST_PASSWORD);
  });

  test('admin section visible in sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Admin users should see admin links
    const adminLinks = page.locator('text=/[Pp]romo [Cc]odes|[Cc]laims|[Ii]mports/i');
    const count = await adminLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('promo codes page loads with table', async ({ page }) => {
    await page.goto('/admin/promo-codes');
    await page.waitForLoadState('networkidle');

    // Should show "Promo Codes" heading
    await expect(page.locator('text=Promo Codes').first()).toBeVisible();

    // Should have a "Create Code" button
    await expect(page.getByRole('button', { name: /Create/i }).first()).toBeVisible();
  });
});
