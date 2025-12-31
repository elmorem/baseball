/**
 * Shared fixtures and helpers for E2E tests.
 */

import { test as base, expect, Page } from '@playwright/test';

/**
 * Test user credentials for E2E testing.
 */
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
};

/**
 * Mock player data for testing.
 */
export const TEST_PLAYER = {
  player_name: 'E2E Test Player',
  position: 'CF',
  games: 100,
  at_bats: 400,
  runs: 80,
  hits: 120,
  home_runs: 25,
  batting_average: '.300',
};

/**
 * Helper to log in a test user.
 * This attempts actual login if backend is available,
 * otherwise sets up mock auth state.
 */
export async function loginUser(page: Page, email?: string, password?: string) {
  const userEmail = email || TEST_USER.email;
  const userPassword = password || TEST_USER.password;

  try {
    // Try actual login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect or error
    await Promise.race([
      page.waitForURL('/players', { timeout: 5000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 }),
    ]);
  } catch {
    // Backend not available, set mock auth
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-e2e-token');
    });
    await page.goto('/players');
  }
}

/**
 * Helper to log out user.
 */
export async function logoutUser(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
  });
  await page.context().clearCookies();
}

/**
 * Helper to clear all application state.
 */
export async function clearAppState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

/**
 * Extended test with authentication helpers.
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await loginUser(page);
    await use(page);
    await logoutUser(page);
  },
});

export { expect };
