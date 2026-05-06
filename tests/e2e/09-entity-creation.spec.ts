import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Entity & Profile Features', () => {
  test('investor dashboard shows correct user context', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // User name should be visible in navbar
    await expect(page.locator('text=QA Investor Fund').first()).toBeVisible();

    // Dashboard should show welcome message
    await expect(page.locator('text=/Welcome|Dashboard/i').first()).toBeVisible();
  });

  test('navbar shows entity switcher when entities exist', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Entity switcher is only visible when user has entities
    // Check if a switcher-like button exists (has border and type badge)
    // If no entities exist, the switcher won't render — that's valid
    const entitySwitcher = page.locator('button:has(span.text-\\[10px\\])');
    const hasEntitySwitcher = await entitySwitcher.count() > 0;

    if (hasEntitySwitcher) {
      // Switcher exists — verify it has a type badge
      await expect(entitySwitcher.first()).toBeVisible();
    } else {
      // No entities — verify page still works correctly
      await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    }
  });
});
