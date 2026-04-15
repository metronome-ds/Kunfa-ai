import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Deal Room', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.admin, TEST_PASSWORD);
  });

  test('deal room page loads with tabs', async ({ page }) => {
    await page.goto('/data-room');
    await page.waitForLoadState('networkidle');

    // Should have both tabs visible
    await expect(page.locator('text=Investor Room').first()).toBeVisible();
    await expect(page.locator('text=Private').first()).toBeVisible();
  });

  test('can click between tabs without errors', async ({ page }) => {
    await page.goto('/data-room');
    await page.waitForLoadState('networkidle');

    // Click Private Docs tab
    await page.locator('text=Private').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

    // Click Investor Room tab
    await page.locator('text=Investor Room').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });
});
