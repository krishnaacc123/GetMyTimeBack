
import { test, expect } from '@playwright/test';

test.describe('WorkSpan E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming the app is running on localhost:3000
    await page.goto('/');
  });

  test('User can start a session, see the timer, and stop it', async ({ page }) => {
    // 1. Initial State
    await expect(page.getByText('WorkSpan')).toBeVisible();
    await expect(page.getByText('START WORKING')).toBeVisible();

    // 2. Start Timer
    await page.getByText('START WORKING').click();

    // 3. Verify Active State
    // The timer should show 25:00 initially
    await expect(page.getByText('25:00')).toBeVisible();
    await expect(page.getByText('Focusing...')).toBeVisible();

    // 4. Stop Timer
    await page.getByText('End Session').click();

    // 5. Back to Idle
    await expect(page.getByText('START WORKING')).toBeVisible();
  });

  test('User can update settings', async ({ page }) => {
    // 1. Open Settings (click on the big number)
    await page.getByLabel(/Current target duration is/).click();
    await expect(page.getByText('Settings', { exact: true })).toBeVisible();

    // 2. Change Work Duration to 50
    const workInput = page.getByLabel('Work Duration (min)');
    await workInput.fill('50');

    // 3. Save
    await page.getByText('Save').click();

    // 4. Verify Home Screen updates
    await expect(page.getByText('50', { exact: true })).toBeVisible();
  });

  test('User can view stats board', async ({ page }) => {
    // 1. Click Stats Button (Chart Icon)
    await page.getByLabel('View Statistics').click();

    // 2. Verify Board Opens
    await expect(page.getByText('Activity Board')).toBeVisible();
    await expect(page.getByText('Work This Week')).toBeVisible();

    // 3. Close
    await page.getByText('Close').click();
    await expect(page.getByText('Activity Board')).not.toBeVisible();
  });

  test('Theme toggle works', async ({ page }) => {
    // Check default light mode (bg-retro-paper is #fdf6e3)
    const body = page.locator('body');
    // Note: Tailwind classes might not compute purely to styles in playwright without checking computed styles, 
    // but we can check if the button emoji changes or if class 'dark' is added to html.
    
    const themeBtn = page.getByLabel('Toggle Theme');
    await expect(themeBtn).toHaveText('🌙'); // Indicates Light Mode is active

    await themeBtn.click();
    
    // Should now show Sun
    await expect(themeBtn).toHaveText('☀️');
    
    // HTML should have class dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('Complex flow: Study -> Break -> Resume -> Break -> End -> Verify Logs', async ({ page }) => {
    // 1. Start Study
    await page.getByText('START WORKING').click();
    await expect(page.getByText('Focusing...')).toBeVisible();

    // Wait >1s to ensure study log has duration
    await page.waitForTimeout(1500);

    // 2. Take Break
    await page.getByText('Take Break').click();
    await expect(page.getByText('Chilling Time')).toBeVisible();

    // Wait >1s to ensure break log has duration
    await page.waitForTimeout(1500);

    // 3. Resume Study (This should create the first BREAK log)
    await page.getByText('Resume Session').click();
    await expect(page.getByText('Focusing...')).toBeVisible();
    
    // Wait >1s for second study segment
    await page.waitForTimeout(1500);

    // 4. Take Break Again
    await page.getByText('Take Break').click();
    await expect(page.getByText('Chilling Time')).toBeVisible();

    // Wait >1s for second break segment
    await page.waitForTimeout(1500);

    // 5. End Session (Should create STUDY log for combined time + BREAK log for current break)
    await page.getByText('End Session').click();

    // 6. Verify Session Summary Modal
    // Since we did both work and break, we expect "Session Complete!" and dual stats
    await expect(page.getByText('Session Complete!')).toBeVisible();
    await expect(page.getByText('Time Worked')).toBeVisible();
    await expect(page.getByText('Break Duration')).toBeVisible();
    
    // 7. Click Got It
    await page.getByText('Got it!').click();
    await expect(page.getByText('START WORKING')).toBeVisible();

    // 8. Verify Logs in Stats
    await page.getByLabel('View Statistics').click();

    // We expect 3 logs:
    // 1. First Break (triggered by Resume)
    // 2. Study Session (aggregated, triggered by End Session from Break)
    // 3. Second Break (triggered by End Session from Break)
    // IMPORTANT: Wait for dialog animation
    const recentActivityRows = page.locator('.space-y-3 .bg-white');
    await expect(recentActivityRows).toHaveCount(3);
    
    // Verify we have both types
    await expect(page.getByText('WORK', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('BREAK', { exact: true }).first()).toBeVisible();
  });
});