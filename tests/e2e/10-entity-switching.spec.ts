import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Navigation & Page Switching', () => {
  test('can navigate between dashboard pages', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    // Start on dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

    // Navigate to pipeline via sidebar
    await page.getByRole('link', { name: /Pipeline/i }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/pipeline/);
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('can navigate back to dashboard from other pages', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    // Start on pipeline
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard via sidebar
    await page.getByRole('link', { name: /Dashboard/i }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
