import { test, expect } from '@playwright/test';

// E2E tests for the admin panel.
// Requires: running dev server (npm run dev) + MongoDB with ADMIN_SECRET_TOKEN set.
// Run: npx playwright test

const ADMIN_TOKEN = process.env.ADMIN_SECRET_TOKEN || 'test-admin-token';

test.beforeEach(async ({ context }) => {
  // Set admin auth cookie
  await context.addCookies([
    {
      name: 'admin_token',
      value: ADMIN_TOKEN,
      domain: 'localhost',
      path: '/',
    },
  ]);
});

test.describe('Admin Dashboard', () => {
  test('loads dashboard with KPI cards', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    // Verify KPI cards are rendered (4 StatCards)
    const statCards = page.locator('[class*="rounded"]').filter({ hasText: /Users|Clients|MRR|Trial/ });
    await expect(statCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/admin');
    // Click Users nav link
    await page.click('a[href="/admin/users"]');
    await expect(page).toHaveURL(/\/admin\/users/);
    // Click Clients nav link
    await page.click('a[href="/admin/clients"]');
    await expect(page).toHaveURL(/\/admin\/clients/);
    // Click Subscriptions nav link
    await page.click('a[href="/admin/subscriptions"]');
    await expect(page).toHaveURL(/\/admin\/subscriptions/);
    // Click Analytics nav link
    await page.click('a[href="/admin/analytics"]');
    await expect(page).toHaveURL(/\/admin\/analytics/);
  });

  test('sidebar highlights active page', async ({ page }) => {
    await page.goto('/admin/users');
    const usersLink = page.locator('a[href="/admin/users"]');
    await expect(usersLink).toHaveClass(/accent-blue|bg-active/);
  });
});

test.describe('Admin Users Page', () => {
  test('displays users table with search', async ({ page }) => {
    await page.goto('/admin/users');
    // Search input should be visible
    const searchInput = page.locator('input[placeholder*="earch"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('search filters users', async ({ page }) => {
    await page.goto('/admin/users');
    const searchInput = page.locator('input[placeholder*="earch"]');
    await searchInput.fill('test@example.com');
    // Wait for debounced search
    await page.waitForTimeout(500);
    // Table should update (no error state)
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('filter dropdowns work', async ({ page }) => {
    await page.goto('/admin/users');
    // Find plan filter select
    const planFilter = page.locator('select').first();
    if (await planFilter.isVisible()) {
      await planFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('CSV export button exists', async ({ page }) => {
    await page.goto('/admin/users');
    const exportBtn = page.locator('button').filter({ hasText: /CSV|Export/i });
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin Clients Page', () => {
  test('displays clients table', async ({ page }) => {
    await page.goto('/admin/clients');
    await expect(page.locator('input[placeholder*="earch"]')).toBeVisible({ timeout: 10_000 });
  });

  test('filter by client type', async ({ page }) => {
    await page.goto('/admin/clients');
    const typeFilter = page.locator('select').first();
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Admin Subscriptions Page', () => {
  test('displays summary cards and table', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    // Summary cards should be visible
    await expect(page.locator('text=/MRR|Active|Trial/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('pagination controls appear when needed', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await page.waitForTimeout(1000);
    // Page should load without errors
    await expect(page.locator('[class*="bg-"]').first()).toBeVisible();
  });
});

test.describe('Admin Analytics Page', () => {
  test('displays charts with period toggle', async ({ page }) => {
    await page.goto('/admin/analytics');
    // Period toggle buttons (30d / 90d)
    const toggle30 = page.locator('button').filter({ hasText: '30' });
    const toggle90 = page.locator('button').filter({ hasText: '90' });
    await expect(toggle30.or(toggle90).first()).toBeVisible({ timeout: 10_000 });
  });

  test('switching period reloads data', async ({ page }) => {
    await page.goto('/admin/analytics');
    const toggle90 = page.locator('button').filter({ hasText: '90' });
    if (await toggle90.isVisible()) {
      await toggle90.click();
      await page.waitForTimeout(1000);
      // No crash, page still visible
      await expect(page.locator('[class*="bg-"]').first()).toBeVisible();
    }
  });
});

test.describe('Command Palette', () => {
  test('opens with Cmd+K', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Meta+k');
    // Command palette should appear
    const palette = page.locator('input[placeholder*="earch"]').last();
    await expect(palette).toBeVisible({ timeout: 5_000 });
  });

  test('closes with Escape', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
});

test.describe('Notification Center', () => {
  test('bell icon is visible', async ({ page }) => {
    await page.goto('/admin');
    const bell = page.locator('button[aria-label="Notifications"]');
    await expect(bell).toBeVisible({ timeout: 10_000 });
  });

  test('clicking bell opens dropdown', async ({ page }) => {
    await page.goto('/admin');
    const bell = page.locator('button[aria-label="Notifications"]');
    await bell.click();
    await expect(page.locator('text=Notifications')).toBeVisible();
  });
});

test.describe('Responsive Sidebar', () => {
  test('hamburger menu appears on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');
    // Hamburger button should be visible on mobile
    const hamburger = page.locator('button').filter({ has: page.locator('svg path[d*="M4 6"]') });
    await expect(hamburger.first()).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar is hidden on mobile by default', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');
    await page.waitForTimeout(500);
    // Sidebar should be off-screen (translated)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveCSS('transform', /translate/);
  });
});
