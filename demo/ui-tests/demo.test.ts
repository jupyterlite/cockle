import { test, expect } from '@playwright/test';

test('visual test', async ({ page }) => {
  await page.goto('/');

  const wait = 100; // milliseconds

  await page.locator('div.xterm-screen').click(); // sets focus for keyboard input

  await page.keyboard.type('ls'); // avoid timestamps
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);

  await page.keyboard.type('cp file.txt file2.txt');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);

  await page.keyboard.type('ls'); // avoid timestamps
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);

  await page.keyboard.type('una');
  await page.keyboard.press('Tab'); // tab complete command name
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);

  await page.keyboard.type('grep ember mon');
  await page.keyboard.press('Tab'); // tab complete filename
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);

  await page.keyboard.press('Tab'); // list all commands
  await page.waitForTimeout(wait);

  await page.keyboard.type('abc');
  await page.keyboard.press('Enter'); // no such command
  await page.waitForTimeout(wait);

  await expect(page).toHaveScreenshot();
});
