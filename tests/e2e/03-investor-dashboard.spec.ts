import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Investor Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFree, TEST_PASSWORD);
  });

  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('sidebar has Browse Companies and Pipeline', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /Browse Companies/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Pipeline/i }).first()).toBeVisible();
  });

  test('sidebar does NOT have Services link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Services is a startup-only section — should NOT appear for investors
    await expect(page.getByRole('link', { name: /^Services$/i })).not.toBeVisible();
  });

  test('deals page loads', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('pipeline page loads', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });
});
