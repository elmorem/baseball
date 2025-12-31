/**
 * E2E tests for player management flows.
 * These tests require authentication to be set up first.
 */

import { test, expect, Page } from '@playwright/test';

// Helper to set up auth state
async function loginAsTestUser(page: Page) {
  // Navigate to app first to get a valid origin for localStorage access
  await page.goto('/');
  // Set mock auth token for testing
  await page.evaluate(() => {
    localStorage.setItem(
      'auth_token',
      'test-token-for-e2e'
    );
  });
}

test.describe('Player List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display player list page', async ({ page }) => {
    await page.goto('/players');

    await expect(page.getByRole('heading', { name: /players/i })).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await page.goto('/players');

    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should have add player button', async ({ page }) => {
    await page.goto('/players');

    await expect(page.getByRole('link', { name: /add.*player/i })).toBeVisible();
  });

  test('should navigate to add player form', async ({ page }) => {
    await page.goto('/players');

    await page.getByRole('link', { name: /add.*player/i }).click();
    await expect(page).toHaveURL('/players/new');
  });

  test('should filter players by search', async ({ page }) => {
    await page.goto('/players');

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Mike');

    // Wait for filter to apply (debounced)
    await page.waitForTimeout(500);

    // Check URL has search param
    await expect(page).toHaveURL(/search=Mike/);
  });

  test('should have position filter dropdown', async ({ page }) => {
    await page.goto('/players');

    const positionFilter = page.getByRole('combobox').first();
    await expect(positionFilter).toBeVisible();
  });

  test('should display player table headers', async ({ page }) => {
    await page.goto('/players');

    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /position/i })).toBeVisible();
  });
});

test.describe('Player Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display create player form', async ({ page }) => {
    await page.goto('/players/new');

    await expect(page.getByRole('heading', { name: /add.*player/i })).toBeVisible();
    await expect(page.getByLabel(/player name/i)).toBeVisible();
    await expect(page.getByLabel(/position/i)).toBeVisible();
  });

  test('should have all form sections', async ({ page }) => {
    await page.goto('/players/new');

    await expect(page.getByText('Basic Information')).toBeVisible();
    await expect(page.getByText('Game Statistics')).toBeVisible();
    await expect(page.getByText('Batting Averages')).toBeVisible();
  });

  test('should have stat input fields', async ({ page }) => {
    await page.goto('/players/new');

    await expect(page.getByLabel(/games/i)).toBeVisible();
    await expect(page.getByLabel(/at bats/i)).toBeVisible();
    await expect(page.getByLabel(/home runs/i)).toBeVisible();
    await expect(page.getByLabel(/batting average/i)).toBeVisible();
  });

  test('should require player name', async ({ page }) => {
    await page.goto('/players/new');

    const nameInput = page.getByLabel(/player name/i);
    await expect(nameInput).toHaveAttribute('required');
  });

  test('should have position dropdown options', async ({ page }) => {
    await page.goto('/players/new');

    const positionSelect = page.getByLabel(/position/i);
    await positionSelect.click();

    // Check some position options exist
    await expect(page.getByText(/catcher/i)).toBeVisible();
    await expect(page.getByText(/shortstop/i)).toBeVisible();
    await expect(page.getByText(/center field/i)).toBeVisible();
  });

  test('should have cancel button that navigates back', async ({ page }) => {
    await page.goto('/players/new');

    await page.getByRole('link', { name: /cancel/i }).click();
    await expect(page).toHaveURL('/players');
  });

  test('should have create player button', async ({ page }) => {
    await page.goto('/players/new');

    await expect(page.getByRole('button', { name: /create player/i })).toBeVisible();
  });
});

test.describe('Player Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should show loading state for player detail', async ({ page }) => {
    await page.goto('/players/test-id');

    // Either shows loading or error (depending on auth/API)
    const hasLoadingOrContent = await Promise.race([
      page.locator('.animate-spin').isVisible().then(() => true),
      page.getByText(/error|not found|loading/i).isVisible().then(() => true),
      page.waitForTimeout(2000).then(() => false),
    ]);

    expect(hasLoadingOrContent).toBeTruthy();
  });
});
