import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Entity Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);
  });

  test('entity switcher exists in navbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Entity switcher button should be visible (has a type badge like "Fund" or "Startup")
    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await expect(switcher).toBeVisible();
  });

  test('dropdown opens on click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await switcher.click();

    // Dropdown should appear with "Your Entities" header
    await expect(page.locator('text=Your Entities')).toBeVisible();
  });

  test('create buttons visible in dropdown', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await switcher.click();

    await expect(page.locator('text=Create New Fund')).toBeVisible();
    await expect(page.locator('text=Create New Company')).toBeVisible();
  });

  test('dropdown closes on outside click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const switcher = page.locator('button:has-text("Fund"), button:has-text("Startup")').first();
    await switcher.click();
    await expect(page.locator('text=Your Entities')).toBeVisible();

    // Click outside
    await page.locator('h2').first().click();
    await expect(page.locator('text=Your Entities')).not.toBeVisible();
  });
});
