import { expect, type Page } from '@playwright/test';
import { test } from './utils';

// Wrappers to call tokenize in browser context.
async function tokenize(page: Page, text: string): Promise<any> {
  return await page.evaluate(text => globalThis.cockle.tokenize(text), text);
}

async function tokenizeWithAliases(page: Page, text: string): Promise<any> {
  return await page.evaluate(text => {
    const aliases = new globalThis.cockle.Aliases();

    // Set standard aliases that are normally set in ShellImpl from cockle-config.json
    aliases.set("dir", "dir --color=auto")
    aliases.set("grep", "grep --color=auto")
    aliases.set("ls", "ls --color=auto")
    aliases.set("ll", "ls -lF")
    aliases.set("vdir", "vdir --color=auto")
    aliases.set("vi", "vim")

    return globalThis.cockle.tokenize(text, true, aliases);
  }, text);
}

test.describe('tokenize', () => {
  test('should support no tokens', async ({ page }) => {
    expect(await tokenize(page, '')).toEqual([]);
    expect(await tokenize(page, ' ')).toEqual([]);
    expect(await tokenize(page, '  ')).toEqual([]);
  });

  test('should support single token', async ({ page }) => {
    expect(await tokenize(page, 'pwd')).toEqual([{ offset: 0, value: 'pwd' }]);
    expect(await tokenize(page, 'grep')).toEqual([{ offset: 0, value: 'grep' }]);
  });

  test('should support single token ignoring whitespace', async ({ page }) => {
    expect(await tokenize(page, 'ls  ')).toEqual([{ offset: 0, value: 'ls' }]);
    expect(await tokenize(page, '  ls')).toEqual([{ offset: 2, value: 'ls' }]);
    expect(await tokenize(page, ' ls   ')).toEqual([{ offset: 1, value: 'ls' }]);
  });

  test('should support multiple tokens', async ({ page }) => {
    expect(await tokenize(page, 'ls -al; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-al' },
      { offset: 6, value: ';' },
      { offset: 8, value: 'pwd' }
    ]);
  });

  test('should support delimiters with and without whitespace', async ({ page }) => {
    expect(await tokenize(page, 'ls;')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: ';' }
    ]);
    expect(await tokenize(page, ';ls')).toEqual([
      { offset: 0, value: ';' },
      { offset: 1, value: 'ls' }
    ]);
    expect(await tokenize(page, ';ls;;')).toEqual([
      { offset: 0, value: ';' },
      { offset: 1, value: 'ls' },
      { offset: 3, value: ';;' }
    ]);
    expect(await tokenize(page, 'ls ; ; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: ';' },
      { offset: 5, value: ';' },
      { offset: 7, value: 'pwd' }
    ]);
    expect(await tokenize(page, 'ls ;; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: ';;' },
      { offset: 6, value: 'pwd' }
    ]);
    expect(await tokenize(page, 'ls;pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: ';' },
      { offset: 3, value: 'pwd' }
    ]);
    expect(await tokenize(page, 'ls;;pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: ';;' },
      { offset: 4, value: 'pwd' }
    ]);
    expect(await tokenize(page, ' ;; ')).toEqual([{ offset: 1, value: ';;' }]);
    expect(await tokenize(page, ' ; ; ')).toEqual([
      { offset: 1, value: ';' },
      { offset: 3, value: ';' }
    ]);
  });

  test('should support pipe', async ({ page }) => {
    expect(await tokenize(page, 'ls -l | sort')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '|' },
      { offset: 8, value: 'sort' }
    ]);
    expect(await tokenize(page, 'ls -l|sort')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 5, value: '|' },
      { offset: 6, value: 'sort' }
    ]);
  });

  test('should support redirection of stdout', async ({ page }) => {
    expect(await tokenize(page, 'ls -l > somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '>' },
      { offset: 8, value: 'somefile' }
    ]);
    expect(await tokenize(page, 'ls -l>somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 5, value: '>' },
      { offset: 6, value: 'somefile' }
    ]);
    expect(await tokenize(page, 'ls >> somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '>>' },
      { offset: 6, value: 'somefile' }
    ]);
    expect(await tokenize(page, 'ls>>somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: '>>' },
      { offset: 4, value: 'somefile' }
    ]);
    expect(await tokenize(page, 'ls >>somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '>>' },
      { offset: 5, value: 'somefile' }
    ]);
    expect(await tokenize(page, 'ls>> somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: '>>' },
      { offset: 5, value: 'somefile' }
    ]);
  });

  test('should support redirection of stdin', async ({ page }) => {
    expect(await tokenize(page, 'wc -l < somefile')).toEqual([
      { offset: 0, value: 'wc' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '<' },
      { offset: 8, value: 'somefile' }
    ]);
  });


  test('should use aliases', async ({ page }) => {
    expect(await tokenizeWithAliases(page, 'll')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' }
    ]);
    expect(await tokenizeWithAliases(page, 'll;')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' },
      { offset: 19, value: ';' }
    ]);
    expect(await tokenizeWithAliases(page, ' ll ')).toEqual([
      { offset: 1, value: 'ls' },
      { offset: 4, value: '--color=auto' },
      { offset: 17, value: '-lF' }
    ]);
    expect(await tokenizeWithAliases(page, 'cat; ll')).toEqual([
      { offset: 0, value: 'cat' },
      { offset: 3, value: ';' },
      { offset: 5, value: 'ls' },
      { offset: 8, value: '--color=auto' },
      { offset: 21, value: '-lF' }
    ]);
    expect(await tokenizeWithAliases(page, 'll; cat')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' },
      { offset: 19, value: ';' },
      { offset: 21, value: 'cat' }
    ]);
    expect(await tokenizeWithAliases(page, 'vi')).toEqual([
      { offset: 0, value: 'vim' },
    ]);
  });

  test.describe('quote handling', () => {
    test('should support matching single and double quotes', async ({ page }) => {
      expect(await tokenize(page, "'ls -l'")).toEqual([{ offset: 0, value: 'ls -l' }]);
      expect(await tokenize(page, '"ls -l"')).toEqual([{ offset: 0, value: 'ls -l' }]);
    });

    test('should throw if end quotes missing', async ({ page }) => {
      expect(async () => await tokenize(page, '"ls')).rejects.toThrow();
      expect(async () => await tokenize(page, "'ls")).rejects.toThrow();
    });

    test('should work next to whitespace', async ({ page }) => {
      expect(await tokenize(page, 'ls "a b"')).toEqual([
        { offset: 0, value: 'ls' },
        { offset: 3, value: 'a b' }
      ]);
      expect(await tokenize(page, '"a b" ls')).toEqual([
        { offset: 0, value: 'a b' },
        { offset: 6, value: 'ls' }
      ]);
    });

    test('should support containing the other quote type', async ({ page }) => {
      expect(await tokenize(page, '"xy\'s"')).toEqual([{ offset: 0, value: "xy's" }]);
      expect(await tokenize(page, "'xy\"s'")).toEqual([{ offset: 0, value: 'xy"s' }]);
    });

    test('should join adjacent quoted sections', async ({ page }) => {
      expect(await tokenize(page, '"ls -l""h"')).toEqual([{ offset: 0, value: 'ls -lh' }]);
    });

    test('should join a preceding non-quoted section', async ({ page }) => {
      expect(await tokenize(page, 'ABC="ab c"')).toEqual([{ offset: 0, value: 'ABC=ab c' }]);
    });

    test('should join a following non-quoted section', async ({ page }) => {
      expect(await tokenize(page, '"ab c"d')).toEqual([{ offset: 0, value: 'ab cd' }]);
    });

    test('should support a complicated example', async ({ page }) => {
      expect(await tokenize(page, 'lua -e "A=3; B=7" -v')).toEqual([
        { offset: 0, value: 'lua' },
        { offset: 4, value: '-e' },
        { offset: 7, value: 'A=3; B=7' },
        { offset: 18, value: '-v' }
      ]);
    });
  });
});
