import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Subscription & Promo', () => {
  test('settings page shows Plan & Billing section', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFree, TEST_PASSWORD);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Plan & Billing section should exist
    await expect(page.locator('text=/[Pp]lan|[Bb]illing/i').first()).toBeVisible();
  });

  test('current tier text is visible', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFree, TEST_PASSWORD);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should show current tier (e.g., "Free", "Starter", "Growth", etc.)
    const tierBadge = page.locator('text=/Free|Starter|Growth|Scale|Pro|Fund|Enterprise/i').first();
    await expect(tierBadge).toBeVisible();
  });
});
