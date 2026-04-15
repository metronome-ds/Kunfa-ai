import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Communities', () => {
  test('fund investor can access communities', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/communities');
    await page.waitForLoadState('networkidle');

    // Should NOT show a feature gate (fund tier has access)
    // Look for community content instead of upgrade prompt
    const hasGate = await page.locator('text=/[Uu]pgrade to Fund/i').isVisible();
    expect(hasGate).toBe(false);
  });

  test('communities page shows content or create CTA', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/communities');
    await page.waitForLoadState('networkidle');

    // Should show either community list or a create CTA
    const hasCommunities = await page.locator('text=/[Cc]ommunit/i').first().isVisible();
    expect(hasCommunities).toBe(true);
  });
});
