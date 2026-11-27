import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, test } from '../utils';

// Prompt displayed when paging, preceded by erase to end of line.
const pagedPrompt = '\x1b[K:';

// Both commands write lines that start with the line index, e.g. '12: '.
const commands = [
  ['js-pager', 'js-pager'],
  ['external-pager', 'external-pager']
];

commands.forEach(([description, cmd]) => {
  describeCoiAndNonCoi(description, () => {
    test('should write output that fits on one page and exit', async ({ page }) => {
      const output = await page.evaluate(async cmd => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.setSize({ rows: 6, columns: 80 });
        await shell.inputLine(`${cmd} 3`);
        const exitCode = await shell.exitCode();
        return [exitCode, output.text];
      }, cmd);
      expect(output[0]).toBe(0);
      expect(output[1]).toContain('0: ');
      expect(output[1]).toContain('2: ');
      expect(output[1]).not.toContain(pagedPrompt);
    });

    test('should page long output and quit', async ({ page }) => {
      const output = await page.evaluate(
        async ([cmd, pagedPrompt]) => {
          const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({ externalCommands });
          await shell.setSize({ rows: 6, columns: 80 });
          const paged = output.contains(pagedPrompt);
          const cmdPromise = shell.inputLine(`${cmd} 30`);
          await paged;
          await terminalInput(shell, ['q']);
          await cmdPromise;
          const exitCode = await shell.exitCode();
          return [exitCode, output.text];
        },
        [cmd, pagedPrompt]
      );
      expect(output[0]).toBe(0);
      expect(output[1]).toContain('4: ');
      expect(output[1]).not.toContain('7: ');
      expect(output[1]).toContain(pagedPrompt);
    });

    test('should scroll to end and show (END)', async ({ page }) => {
      const output = await page.evaluate(
        async ([cmd, pagedPrompt]) => {
          const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({ externalCommands });
          await shell.setSize({ rows: 6, columns: 80 });
          const paged = output.contains(pagedPrompt);
          const cmdPromise = shell.inputLine(`${cmd} 30`);
          await paged;
          output.clear();
          await terminalInput(shell, ['G', 'q']);
          await cmdPromise;
          return output.text;
        },
        [cmd, pagedPrompt]
      );
      expect(output).toContain('29: ');
      expect(output).toContain('(END)');
    });

    test('should show help page', async ({ page }) => {
      const output = await page.evaluate(
        async ([cmd, pagedPrompt]) => {
          const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({ externalCommands });
          await shell.setSize({ rows: 6, columns: 80 });
          const paged = output.contains(pagedPrompt);
          const cmdPromise = shell.inputLine(`${cmd} 30`);
          await paged;
          output.clear();
          // Open help, close help, then quit.
          await terminalInput(shell, ['h', 'q', 'q']);
          await cmdPromise;
          return output.text;
        },
        [cmd, pagedPrompt]
      );
      expect(output).toContain('SUMMARY OF PAGER COMMANDS');
      expect(output).toContain('HELP -- press q when done');
    });

    test('should repaint when terminal is resized', async ({ page }) => {
      const output = await page.evaluate(
        async ([cmd, pagedPrompt]) => {
          const { delay, externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({ externalCommands });
          await shell.setSize({ rows: 6, columns: 80 });
          const paged = output.contains(pagedPrompt);
          const cmdPromise = shell.inputLine(`${cmd} 30`);
          await paged;
          output.clear();
          // js-pager line 5 wraps to 4 rows, so need 12 rows to display line 7.
          await shell.setSize({ rows: 12, columns: 80 });
          await delay(100);
          const afterResize = output.textAndClear();
          await terminalInput(shell, ['q']);
          await cmdPromise;
          return afterResize;
        },
        [cmd, pagedPrompt]
      );
      // Screen erased and more lines displayed.
      expect(output).toContain('\x1b[2J');
      expect(output).toContain('7: ');
    });

    test('should not page when output is redirected to a file', async ({ page }) => {
      const output = await page.evaluate(async cmd => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.setSize({ rows: 6, columns: 80 });
        await shell.inputLine(`${cmd} 30 > out`);
        const exitCode = await shell.exitCode();
        output.clear();
        await shell.inputLine('cat out');
        return [exitCode, output.text];
      }, cmd);
      expect(output[0]).toBe(0);
      expect(output[1]).toContain('0: ');
      expect(output[1]).toContain('29: ');
      expect(output[1]).not.toContain(pagedPrompt);
      expect(output[1]).not.toContain('(END)');
    });

    test('should not page when stdin is redirected', async ({ page }) => {
      const output = await page.evaluate(async cmd => {
        const { externalCommands, shellSetupSimple } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ externalCommands });
        await shell.setSize({ rows: 6, columns: 80 });
        // No terminal input is sent, so if the pager pages the test will time out.
        await shell.inputLine(`${cmd} 30 < file1`);
        const exitCode = await shell.exitCode();
        return [exitCode, output.text];
      }, cmd);
      expect(output[0]).toBe(0);
      expect(output[1]).toContain('0: ');
      expect(output[1]).toContain('29: ');
      expect(output[1]).not.toContain(pagedPrompt);
      expect(output[1]).not.toContain('(END)');
    });
  });
});
