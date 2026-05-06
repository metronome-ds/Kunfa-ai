import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS, TEST_PASSWORD } from './helpers/auth';

/**
 * KUN-133 regression: /api/tenant/investors must return 200 with at least one
 * profile-embedded row. Before the fix, the unqualified `profiles:profiles!inner`
 * embed against entity_members (which has two FKs to profiles) returned PGRST201
 * and the route 500'd on every call. This spec guards the disambiguating FK hint.
 */

const TENANT_PARAM = '?tenant=metronome';

test.describe('KUN-133: /api/tenant/investors PGRST201 regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ACCOUNTS.admin, TEST_PASSWORD);
  });

  test('returns 200 with at least one profile-embedded row', async ({ page }) => {
    await page.goto(`/dashboard${TENANT_PARAM}`);
    await page.waitForLoadState('networkidle');

    const response = await page.request.get(`/api/tenant/investors${TENANT_PARAM}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const first = body.data[0];
    expect(first.user_id).toBeTruthy();
    expect(first).toHaveProperty('full_name');
    expect(first).toHaveProperty('joined_at');
  });
});
