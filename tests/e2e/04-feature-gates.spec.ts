import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Feature Gates', () => {
  test('startup free user sees gate on cap table', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/cap-table');
    await page.waitForLoadState('networkidle');

    // Should show a feature gate / upgrade prompt
    const upgradeText = page.locator('text=/[Uu]pgrade/i').first();
    await expect(upgradeText).toBeVisible();
  });

  test('startup free user sees gate on valuation calculator', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/valuation-calculator');
    await page.waitForLoadState('networkidle');

    const upgradeText = page.locator('text=/[Uu]pgrade/i').first();
    await expect(upgradeText).toBeVisible();
  });

  test('free investor sees gate on communities', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFree, TEST_PASSWORD);

    await page.goto('/communities');
    await page.waitForLoadState('networkidle');

    // Should show a gate mentioning "Fund" tier
    const fundText = page.locator('text=/[Ff]und/i').first();
    await expect(fundText).toBeVisible();
  });
});
