import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

test.describe('Services Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.startup, TEST_PASSWORD);
  });

  test('at least 9 service cards visible', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Service cards have a price indicator (e.g. "$3,500", "$7,500/mo")
    const cards = page.locator('[class*="rounded"] >> text=/\\$/');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test('service card has expandable SOW section', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Click "What's included" on the first card
    const expandButton = page.locator("text=/[Ww]hat's included/i").first();
    await expandButton.click();

    // Should show checklist items
    await expect(page.locator('text=/✓|✅|included/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('discovery call form exists', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Click "Book a Discovery Call" on any card
    const bookButton = page.locator('text=/[Dd]iscovery [Cc]all/i').first();
    await bookButton.click();

    // Should show a form with submit button
    await expect(page.getByRole('button', { name: /[Rr]equest|[Ss]ubmit|[Bb]ook/i }).first()).toBeVisible({ timeout: 5000 });
  });
});
