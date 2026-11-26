/* tests/e2e_behavioral_suite.spec.ts — Behavioral Playwright + WCAG 2.2 AA + Offline Suite */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const APP_URL = process.env.TEST_URL || 'http://127.0.0.1:4173';

test.describe('Mzansi Pathways Behavioral & Failsafe Suite', () => {
  test('1. Zero WCAG 2.2 A/AA violations and zero horizontal overflow at 320px width', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflowPx).toBeLessThanOrEqual(0);
    const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(a11y.violations).toEqual([]);
  });

  test('2. Gallery input omits capture attribute while Camera input keeps capture', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    const galleryCapture = await page.locator('#scan-image-input').getAttribute('capture');
    const cameraCapture = await page.locator('#scan-camera-input').getAttribute('capture');
    expect(galleryCapture).toBeNull();
    expect(cameraCapture).toBe('environment');
  });

  test('3. Full offline resilience after initial shell activation', async ({ context, page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
  });

  test('4. Unverified programmes never render a green eligibility badge', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    const badBadges = await page.locator('[data-verified="false"] .status-green').count();
    expect(badBadges).toBe(0);
  });
});
