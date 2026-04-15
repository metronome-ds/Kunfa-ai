import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Deal Room', () => {
  test('data room page loads without error for startup', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/data-room');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    // Page should show either deal room content or setup CTA
    await expect(page.locator('text=/Deal Room|Data Room|Your Deal Room|Kunfa Score/i').first()).toBeVisible();
  });

  test('data room page loads without error for admin', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.admin, TEST_PASSWORD);

    await page.goto('/data-room');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.locator('text=/Deal Room|Data Room|Your Deal Room|Kunfa Score/i').first()).toBeVisible();
  });
});
