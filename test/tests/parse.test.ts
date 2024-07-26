import { expect, type Page } from '@playwright/test';
import { test } from './utils';

import { CommandNode, PipeNode, RedirectNode } from '../../src/parse';

// Wrappers to call parse in browser context.
async function parse(page: Page, text: string): Promise<any> {
  return await page.evaluate(text => globalThis.cockle.parse(text), text);
}

async function parseWithAliases(page: Page, text: string): Promise<any> {
  return await page.evaluate(text => {
    const aliases = new globalThis.cockle.Aliases();
    return globalThis.cockle.parse(text, true, aliases);
  }, text);
}

test.describe('parse', () => {
  test('should support no commands', async ({ page }) => {
    expect(await parse(page, '')).toEqual([]);
    expect(await parse(page, ' ')).toEqual([]);
    expect(await parse(page, '  ')).toEqual([]);
  });

  test('should support single command', async ({ page }) => {
    expect(await parse(page, 'ls')).toEqual([new CommandNode({ offset: 0, value: 'ls' }, [])]);
    expect(await parse(page, 'ls -al')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [{ offset: 3, value: '-al' }])
    ]);
    expect(await parse(page, 'ls -al;')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [{ offset: 3, value: '-al' }])
    ]);
  });

  test('should support multiple commands', async ({ page }) => {
    expect(await parse(page, 'ls -al;pwd')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [{ offset: 3, value: '-al' }]),
      new CommandNode({ offset: 7, value: 'pwd' }, [])
    ]);
    expect(await parse(page, 'echo abc;pwd;ls -al')).toEqual([
      new CommandNode({ offset: 0, value: 'echo' }, [{ offset: 5, value: 'abc' }]),
      new CommandNode({ offset: 9, value: 'pwd' }, []),
      new CommandNode({ offset: 13, value: 'ls' }, [{ offset: 16, value: '-al' }])
    ]);
  });

  test('should support pipe', async ({ page }) => {
    expect(await parse(page, 'ls | sort')).toEqual([
      new PipeNode([
        new CommandNode({ offset: 0, value: 'ls' }, []),
        new CommandNode({ offset: 5, value: 'sort' }, [])
      ])
    ]);
    expect(await parse(page, 'ls | sort|uniq')).toEqual([
      new PipeNode([
        new CommandNode({ offset: 0, value: 'ls' }, []),
        new CommandNode({ offset: 5, value: 'sort' }, []),
        new CommandNode({ offset: 10, value: 'uniq' }, [])
      ])
    ]);

    expect(await parse(page, 'ls | sort; cat')).toEqual([
      new PipeNode([
        new CommandNode({ offset: 0, value: 'ls' }, []),
        new CommandNode({ offset: 5, value: 'sort' }, [])
      ]),
      new CommandNode({ offset: 11, value: 'cat' }, [])
    ]);
  });

  test('should support redirect of output', async ({ page }) => {
    expect(await parse(page, 'ls -l > file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 6, value: '>' }, { offset: 8, value: 'file' })]
      )
    ]);
    expect(await parse(page, 'ls -l>file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 5, value: '>' }, { offset: 6, value: 'file' })]
      )
    ]);
  });

  test('should raise on redirect of output without target file', async ({ page }) => {
    expect(async () => await parse(page, 'ls >')).rejects.toThrow();
    expect(async () => await parse(page, 'ls >>')).rejects.toThrow();
  });

  test('should support redirect of input', async ({ page }) => {
    expect(await parse(page, 'wc -l < file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'wc' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 6, value: '<' }, { offset: 8, value: 'file' })]
      )
    ]);
  });

  test('should use aliases', async ({ page }) => {
    expect(await parseWithAliases(page, 'll')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [
        { offset: 3, value: '--color=auto' },
        { offset: 16, value: '-lF' }
      ])
    ]);
    expect(await parseWithAliases(page, ' ll;')).toEqual([
      new CommandNode({ offset: 1, value: 'ls' }, [
        { offset: 4, value: '--color=auto' },
        { offset: 17, value: '-lF' }
      ])
    ]);
  });

  test('should support quotes', async ({ page }) => {
    expect(await parse(page, 'alias ll="ls -lF"')).toEqual([
      new CommandNode({ offset: 0, value: 'alias' }, [{ offset: 6, value: 'll=ls -lF' }])
    ]);
    expect(await parse(page, 'alias ll="ls ""-lF"')).toEqual([
      new CommandNode({ offset: 0, value: 'alias' }, [{ offset: 6, value: 'll=ls -lF' }])
    ]);
    expect(await parse(page, 'lua -e "A=3;B=9"')).toEqual([
      new CommandNode({ offset: 0, value: 'lua' }, [
        { offset: 4, value: '-e' },
        { offset: 7, value: 'A=3;B=9' }
      ])
    ]);
  });
});
