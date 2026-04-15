import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Startup Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);
  });

  test('dashboard loads without error', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should not show an error page
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    await expect(page.locator('text=404')).not.toBeVisible();
  });

  test('sidebar exists with startup links', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar should be present
    const sidebar = page.locator('nav, [class*="sidebar"], aside').first();
    await expect(sidebar).toBeVisible();

    // Startup-specific links
    await expect(page.getByRole('link', { name: /Services/i })).toBeVisible();
  });

  test('services page loads from sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /Services/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/services/);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Personal Info').first()).toBeVisible();
  });
});
