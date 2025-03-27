import { test as base, type Page } from '@playwright/test';
import { IOptions } from '../serve/shell_setup';

// Override page fixture to navigate to specific page.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  }
});

// Wrappers to call shell functions in browser context.

// Input multiple characters, one at a time. Support multi-character ANSI escape sequences.
export async function shellInputsSimpleN(
  page: Page,
  charsArray: string[][],
  options: IOptions = {}
): Promise<string[]> {
  return await page.evaluate(
    async ({ charsArray, options }) => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple(options);
      const ret: string[] = [];
      for (const chars of charsArray) {
        for (const char of chars) {
          await shell.input(char);
        }
        await globalThis.cockle.delay();
        ret.push(output.textAndClear());
      }
      return ret;
    },
    { charsArray, options }
  );
}

export async function shellInputsSimple(
  page: Page,
  chars: string[],
  options: IOptions = {}
): Promise<string> {
  return (await shellInputsSimpleN(page, [chars], options))[0];
}

// Accepts multiple lines of input, cannot accept ANSI escape sequences which are multi-character.
// Append '\r' to each line of text to enter.
export async function shellLineSimpleN(
  page: Page,
  lines: string[],
  options: IOptions = {}
): Promise<string[]> {
  return await page.evaluate(
    async ({ lines, options }) => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple(options);
      const ret: string[] = [];
      for (const line of lines) {
        await shell.inputLine(line);
        await globalThis.cockle.delay();
        ret.push(output.textAndClear());
      }
      return ret;
    },
    { lines, options }
  );
}

export async function shellLineComplexN(
  page: Page,
  lines: string[],
  options: IOptions = {}
): Promise<string[]> {
  return await page.evaluate(
    async ({ lines, options }) => {
      const { shell, output } = await globalThis.cockle.shellSetupComplex(options);
      const ret: string[] = [];
      for (const line of lines) {
        await shell.inputLine(line);
        await globalThis.cockle.delay();
        ret.push(output.textAndClear());
      }
      return ret;
    },
    { lines, options }
  );
}

export async function shellLineSimple(
  page: Page,
  line: string,
  options: IOptions = {}
): Promise<string> {
  return (await shellLineSimpleN(page, [line], options))[0];
}

export async function shellLineComplex(
  page: Page,
  line: string,
  options: IOptions = {}
): Promise<string> {
  return (await shellLineComplexN(page, [line], options))[0];
}
