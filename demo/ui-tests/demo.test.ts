import { test, expect } from '@playwright/test';

async function inputLine(page, text: string, appendEnter: boolean = true) {
  for (const char of text) {
    if (char === '\t') {
      await page.keyboard.press('Tab');
    } else {
      await page.keyboard.type(char);
    }
    await page.waitForTimeout(10);
  }
  if (appendEnter) {
    await page.keyboard.press('Enter');
  }
}

test('visual test', async ({ page }) => {
  await page.goto('/');

  const wait = 100; // milliseconds.

  const xterm = page.locator('div.xterm-screen');
  await xterm.click(); // sets focus for keyboard input
  await page.waitForTimeout(wait);

  await inputLine(page, 'cp file.txt file2.txt');
  await page.waitForTimeout(wait);

  await inputLine(page, 'ls'); // avoid timestamps
  await page.waitForTimeout(wait);

  await inputLine(page, 'una\t'); // tab complete command name
  await page.waitForTimeout(wait);

  await inputLine(page, 'grep ember mon\t'); // tab complete filename
  await page.waitForTimeout(wait);

  await inputLine(page, '\t', false); // list all commands
  await page.waitForTimeout(wait);

  await inputLine(page, 'abc'); // no such command
  await page.waitForTimeout(wait);

  await expect(xterm).toHaveScreenshot();
});
