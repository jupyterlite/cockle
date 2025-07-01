import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('cockle-config command', () => {
  test('should show version', async ({ page }) => {
    const output = await shellLineSimple(page, 'cockle-config -v');
    expect(output).toMatch(/^cockle-config -v\r\ncockle \S+\r\n/);
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
      '│ grep    │ wasm │ 3.11    │ ha2cbc09_6   │ https://repo.prefix.dev/emscripten-forge-dev │'
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
});
