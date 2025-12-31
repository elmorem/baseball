/**
 * E2E tests for application navigation.
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Home page should redirect to login or show main content
    await expect(page).toHaveURL(/\/(login|players)?$/);
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/baseball|stats/i);
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');

    // Should show 404 or redirect to login
    const hasContent = await Promise.race([
      page.getByText(/not found|404/i).isVisible().then(() => 'notfound'),
      page.waitForURL(/login/).then(() => 'login'),
      page.waitForTimeout(2000).then(() => 'timeout'),
    ]);

    expect(['notfound', 'login']).toContain(hasContent);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Clear auth
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto('/players');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Responsive Layout', () => {
  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Login form should still be visible on mobile
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should be responsive on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
