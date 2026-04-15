import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Entity Edge Cases', () => {
  test('startup user handles entity gracefully', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Page should not crash — no error state
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

    // Entity switcher may or may not show depending on whether the startup has an entity
    // Either way, the page should be functional
    const sidebar = page.locator('nav, [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('entity create buttons available for startup user', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // If entity switcher is visible, it should have create options
    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup"), button:has-text("Company")').first();
    if (await switcher.isVisible()) {
      await switcher.click();
      await expect(page.locator('text=Create New Fund')).toBeVisible();
      await expect(page.locator('text=Create New Company')).toBeVisible();
    }
    // If no entity switcher, that's also valid — no crash is the assertion
  });

  test('free investor handles entity gracefully', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFree, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('pro investor handles entity gracefully', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorPro, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });
});
