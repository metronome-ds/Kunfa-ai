import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Cross-Role Page Access', () => {
  test('startup user dashboard loads correctly', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Page should not crash
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

    // Sidebar should be functional
    await expect(page.getByRole('button', { name: /Collapse sidebar/i })).toBeVisible();
  });

  test('startup user can access services page', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Services/i }).first()).toBeVisible();
  });

  test('free investor dashboard loads correctly', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFree, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('pro investor dashboard loads correctly', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorPro, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });
});
