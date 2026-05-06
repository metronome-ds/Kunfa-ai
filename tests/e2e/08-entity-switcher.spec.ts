import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Navbar & Profile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.investorFund, TEST_PASSWORD);
  });

  test('navbar has user profile button', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // User profile button shows user name in navbar
    const profileBtn = page.getByRole('button', { name: /QA Investor Fund/i }).first();
    await expect(profileBtn).toBeVisible();
  });

  test('user profile dropdown opens on click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click user profile button in navbar
    const profileBtn = page.getByRole('button', { name: /QA Investor Fund/i }).first();
    await profileBtn.click();

    // Dropdown should show Profile and Settings links
    await expect(page.locator('a:has-text("Profile")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Settings")').first()).toBeVisible();
  });

  test('profile dropdown has navigation links', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const profileBtn = page.getByRole('button', { name: /QA Investor Fund/i }).first();
    await profileBtn.click();

    // Profile link should navigate to /profile
    const profileLink = page.locator('a:has-text("Profile")').first();
    await expect(profileLink).toHaveAttribute('href', '/profile');
  });

  test('profile dropdown closes on outside click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const profileBtn = page.getByRole('button', { name: /QA Investor Fund/i }).first();
    await profileBtn.click();
    await expect(page.locator('a:has-text("Profile")').first()).toBeVisible();

    // Click outside (heading)
    await page.locator('h2').first().click();

    // Dropdown links should no longer be visible
    await expect(page.locator('a:has-text("Profile")').first()).not.toBeVisible();
  });
});
