import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Document & Upload Pages', () => {
  test('data room loads for startup user', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/data-room');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('data room loads for admin user', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.admin, TEST_PASSWORD);

    await page.goto('/data-room');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('term sheet analyzer page loads', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/term-sheet-analyzer');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/[Tt]erm [Ss]heet/i').first()).toBeVisible();
  });

  test('term sheet analyzer has file upload area', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/term-sheet-analyzer');
    await page.waitForLoadState('networkidle');

    // Page should have a file input or dropzone
    const fileInput = page.locator('input[type="file"]');
    const dropzone = page.locator('text=/[Uu]pload|[Dd]rag|[Dd]rop|[Bb]rowse/i').first();
    const hasFileInput = await fileInput.count() > 0;
    const hasDropzone = await dropzone.isVisible();
    expect(hasFileInput || hasDropzone).toBe(true);
  });

  test('company profile page loads for startup', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/company-profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('investors page loads for startup', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/investors');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('debt partners page loads for startup', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/debt-partners');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('cap table page loads for startup', async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);

    await page.goto('/cap-table');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });
});
