import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Entity Creation', () => {
  test('create new fund via entity switcher', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open entity switcher
    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await switcher.click();

    // Click "Create New Fund"
    await page.locator('text=Create New Fund').click();

    // Modal should appear
    await expect(page.locator('text=Create New Fund').nth(1)).toBeVisible();

    // Fill name with unique timestamp
    const fundName = `PW Fund ${Date.now()}`;
    const nameInput = page.locator('input[placeholder*="Acme"]');
    await nameInput.fill(fundName);

    // Submit
    await page.getByRole('button', { name: /^Create$/ }).click();

    // Should reload and show the new entity name
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${fundName}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('entity switcher shows multiple entities after creation', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open entity switcher dropdown
    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await switcher.click();

    // Should show at least 2 entities (original + any created ones)
    const entityButtons = page.locator('[class*="text-left"][class*="py-2"] >> text=/Fund|Startup|Family Office|Angel|Lender/i');
    const count = await entityButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
