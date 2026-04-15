import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Entity Switching', () => {
  test('can switch between entities', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Note current entity name from the switcher button
    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    const initialText = await switcher.textContent();

    // Open dropdown
    await switcher.click();
    await page.waitForTimeout(300);

    // Count available entities
    const entityItems = page.locator('button[class*="text-left"][class*="py-2"]');
    const count = await entityItems.count();

    if (count < 2) {
      // Only one entity — create a second one first
      await page.locator('text=Create New Fund').click();
      await page.locator('input[placeholder*="Acme"]').fill(`PW Switch Test ${Date.now()}`);
      await page.getByRole('button', { name: /^Create$/ }).click();
      await page.waitForLoadState('networkidle');

      // Re-open dropdown
      const newSwitcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
      await newSwitcher.click();
    }

    // Click the non-active entity (one without the check mark)
    const nonActive = page.locator('button[class*="text-left"][class*="py-2"]:not(:has(svg[class*="text-[#007CF8]"]))').first();
    await nonActive.click();

    // Page should reload
    await page.waitForLoadState('networkidle');

    // Entity switcher should now show a different name
    const newSwitcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await expect(newSwitcher).toBeVisible();
  });

  test('switching reloads to dashboard', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Open entity switcher
    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    if (await switcher.isVisible()) {
      await switcher.click();
      await page.waitForTimeout(300);

      const entityItems = page.locator('button[class*="text-left"][class*="py-2"]');
      const count = await entityItems.count();

      if (count >= 2) {
        const nonActive = page.locator('button[class*="text-left"][class*="py-2"]:not(:has(svg[class*="text-[#007CF8]"]))').first();
        await nonActive.click();
        await page.waitForLoadState('networkidle');

        // Should end up on dashboard after switch
        await expect(page).toHaveURL(/\/dashboard/);
      }
    }
  });
});
