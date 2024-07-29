import { test as base, type Page } from '@playwright/test';

// Override page fixture to navigate to specific page.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  }
});

// Wrappers to call shell functions in browser context.

// Shell.inputs
export async function shellInputsSimpleN(page: Page, charsArray: string[][]): Promise<string[]> {
  return await page.evaluate(async charsArray => {
    const { shell, output } = await globalThis.cockle.shell_setup_simple();
    const ret: string[] = [];
    for (const chars of charsArray) {
      await shell.inputs(chars);
      ret.push(output.text);
      output.clear();
    }
    return ret;
  }, charsArray);
}

export async function shellInputsSimple(page: Page, chars: string[]): Promise<string> {
  return (await shellInputsSimpleN(page, [chars]))[0];
}

// Shell._runCommands.
export async function shellRunEmpty(page: Page, text: string): Promise<string[]> {
  return await page.evaluate(async text => {
    const { shell, output } = await globalThis.cockle.shell_setup_empty();
    await shell._runCommands(text);
    return output.text;
  }, text);
}

export async function shellRunSimpleN(page: Page, texts: string[]): Promise<string[]> {
  return await page.evaluate(async texts => {
    const { shell, output } = await globalThis.cockle.shell_setup_simple();
    const ret: string[] = [];
    for (const text of texts) {
      await shell._runCommands(text);
      ret.push(output.text);
      output.clear();
    }
    return ret;
  }, texts);
}

export async function shellRunSimple(page: Page, text: string): Promise<string> {
  return (await shellRunSimpleN(page, [text]))[0];
}
