import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('cockle-config command', () => {
  ['-v', '--version'].forEach(option => {
    test(`should show version using ${option}`, async ({ page }) => {
      const output = await shellLineSimple(page, `cockle-config ${option}`);
      expect(output).toMatch(/\r\ncockle \S+\r\n/);
    });
  });

  ['-h', '--help'].forEach(option => {
    test(`should show help using ${option}`, async ({ page }) => {
      const output = await shellLineSimple(page, `cockle-config ${option}`);
      // Match a few lines.
      expect(output).toMatch(/\r\n\s*-h.*display this help and exit\r\n/);
      expect(output).toMatch(/\r\n\s*-v.*show cockle version\r\n/);
      expect(output).toMatch(/\r\nsubcommands:\r\n/);
      expect(output).toMatch(/\r\n\s+module\s+Show information about one or more modules.\r\n/);
      expect(output).toMatch(/\r\n\s+stdin\s+Configure or show synchronous stdin settings.\r\n/);
    });
  });

  test('should run stdin subcommand', async ({ page }) => {
    const output = await shellLineSimple(page, 'cockle-config stdin');
    const lines = output.split('\r\n');
    expect(lines.length).toBe(8);
    expect(lines[2]).toEqual('│ synchronous stdin   │ short name │ available │ enabled │');
    expect(lines[4]).toEqual('│ shared array buffer │ sab        │ yes       │ yes     │');
    expect(lines[5]).toEqual('│ service worker      │ sw         │           │         │');
  });

  test('should run package subcommand', async ({ page }) => {
    const output = await shellLineSimple(page, 'cockle-config package grep');
    const lines = output.split('\r\n');
    expect(lines.length).toBe(7);
    expect(lines[2]).toEqual(
      '│ package │ type │ version │ build string │ source                                       │'
    );
    expect(lines[4]).toMatch(
      '│ grep    │ wasm │ 3.11    │ h4e94343_7   │ https://repo.prefix.dev/emscripten-forge-dev │'
    );

    const output1 = await shellLineSimple(page, 'cockle-config package xyz123');
    expect(output1).toMatch('\r\nError: Unknown package(s): xyz123\r\n');
  });

  test('should run module subcommand', async ({ page }) => {
    const output = await shellLineSimple(page, 'cockle-config module fs');
    const lines = output.split('\r\n');
    expect(lines.length).toBe(7);
    expect(lines[2]).toEqual('│ module │ package   │ cached │');
    expect(lines[4]).toMatch('│ fs     │ cockle_fs │ yes    │');

    const output1 = await shellLineSimple(page, 'cockle-config module mm123');
    expect(output1).toMatch('\r\nError: Unknown module(s): mm123\r\n');
  });

  test('should run command subcommand', async ({ page }) => {
    const output = await shellLineSimple(page, 'cockle-config command history');
    const lines = output.split('\r\n');
    expect(lines.length).toBe(7);
    expect(lines[2]).toEqual('│ command │ module    │');
    expect(lines[4]).toMatch('│ history │ <builtin> │');

    const output1 = await shellLineSimple(page, 'cockle-config command c987');
    expect(output1).toMatch('\r\nError: Unknown command(s): c987\r\n');
  });

  test('should filter on command type in command subcommand', async ({ page }) => {
    const output0 = await shellLineSimple(page, 'cockle-config command');
    expect(output0).toMatch(/│ clear\s+│ <builtin>\s+│/);
    expect(output0).toMatch(/│ js-tab\s+│ js-tab\s+│/);
    expect(output0).toMatch(/│ ls\s+│ coreutils\s+│/);

    const output1 = await shellLineSimple(page, 'cockle-config command --builtin');
    expect(output1).toMatch(/│ clear\s+│ <builtin>\s+│/);
    expect(output1).not.toMatch(/│ js-tab\s+│ js-tab\s+│/);
    expect(output1).not.toMatch(/│ ls\s+│ coreutils\s+│/);

    const output2 = await shellLineSimple(page, 'cockle-config command --javascript');
    expect(output2).not.toMatch(/│ clear\s+│ <builtin>\s+│/);
    expect(output2).toMatch(/│ js-tab\s+│ js-tab\s+│/);
    expect(output2).not.toMatch(/│ ls\s+│ coreutils\s+│/);

    const output3 = await shellLineSimple(page, 'cockle-config command --wasm');
    expect(output3).not.toMatch(/│ clear\s+│ <builtin>\s+│/);
    expect(output3).not.toMatch(/│ js-tab\s+│ js-tab\s+│/);
    expect(output3).toMatch(/│ ls\s+│ coreutils\s+│/);

    const output4 = await shellLineSimple(page, 'cockle-config command -j -b');
    expect(output4).toMatch(/│ clear\s+│ <builtin>\s+│/);
    expect(output4).toMatch(/│ js-tab\s+│ js-tab\s+│/);
    expect(output4).not.toMatch(/│ ls\s+│ coreutils\s+│/);
  });

  test('should combine boolean shortName arguments in command subcommand', async ({ page }) => {
    let output0 = await shellLineSimple(page, 'cockle-config command -j -b');
    output0 = output0.slice(output0.indexOf('\r\n'))

    let output1 = await shellLineSimple(page, 'cockle-config command -b -j');
    expect(output1.slice(output1.indexOf('\r\n'))).toEqual(output0);

    let output2 = await shellLineSimple(page, 'cockle-config command -bj');
    expect(output2.slice(output2.indexOf('\r\n'))).toEqual(output0);

    let output3 = await shellLineSimple(page, 'cockle-config command -jb');
    expect(output3.slice(output3.indexOf('\r\n'))).toEqual(output0);
  });
});
