import { expect, test } from '@playwright/test';

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

test('emoji visual test', async ({ page }) => {
  await page.goto('/');

  const wait = 100; // milliseconds.

  async function press(key: string, count: number = 1) {
    for (let i = 0; i < count; i++) {
      await page.keyboard.press(key);
      await page.waitForTimeout(10);
    }
  }

  const xterm = page.locator('div.xterm-screen');
  await xterm.click(); // sets focus for keyboard input
  await page.waitForTimeout(wait);

  // Echo at the command line, the | characters should be aligned.
  await inputLine(page, "echo 'ab🚀🚀cd|'");
  await page.waitForTimeout(wait);

  await inputLine(page, "echo 'ab1234cd|'");
  await page.waitForTimeout(wait);

  // cat accepting stdin.
  await inputLine(page, 'cat');
  await page.waitForTimeout(wait);

  await inputLine(page, '🚀a🚀|');
  await page.waitForTimeout(wait);

  await press('Control+d');
  await page.waitForTimeout(wait);

  // Backspace, delete and insert around emojis.
  await inputLine(page, 'echo 🚀1🚀2🚀3', false);
  await press('ArrowLeft', 3);
  await press('Backspace'); // remove second emoji
  await press('Delete'); // remove 2
  await press('ArrowLeft', 2);
  await inputLine(page, 'X'); // insert before first emoji and run
  await page.waitForTimeout(wait);

  // Leave cursor on the second emoji.
  await inputLine(page, 'echo 🚀🚀🚀', false);
  await press('ArrowLeft', 2);
  await page.waitForTimeout(wait);

  await expect(xterm).toHaveScreenshot();
});
