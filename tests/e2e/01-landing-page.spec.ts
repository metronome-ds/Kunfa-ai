import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('page title contains Kunfa', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Kunfa/i);
  });

  test('hero section exists with CTA button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero heading
    const hero = page.locator('text=The AI-native platform').first();
    await expect(hero).toBeVisible();

    // Primary CTA
    const cta = page.getByRole('button', { name: /Get Your Kunfa Score/i });
    await expect(cta).toBeVisible();
  });

  test('footer exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('text=Kunfa')).toBeVisible();
  });

  test('login page shows login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('signup page shows role selector', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /Startup/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Investor/i })).toBeVisible();
  });
});
