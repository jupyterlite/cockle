import type { Shell } from '@jupyterlite/cockle';
import { delay } from '@jupyterlite/cockle';
import type { MockTerminalOutput } from './output_setup';

/**
 * Helper to provide terminal input whilst a command is running.
 * Pass EOT (ASCII code 4) to finish.
 * There is an optional delay in milliseconds to wait before starting the terminal input to allow
 * the command to start.
 */
export async function terminalInput(
  shell: Shell,
  chars: string[],
  initialDelayMs: number = 100
): Promise<void> {
  if (initialDelayMs > 0) {
    await delay(initialDelayMs);
  }

  for (const char of chars) {
    await shell.input(char);
    await delay(10);
  }
}

/**
 * Helper to provide terminal input to a running command that replies to each character with its
 * upper case equivalent. Waits for the reply to each character before inputting the next, as
 * otherwise the echo of a character may be output before the reply to the previous character.
 */
export async function terminalInputUpperCaseReply(
  shell: Shell,
  output: MockTerminalOutput,
  chars: string[],
  initialDelayMs: number = 100
): Promise<void> {
  if (initialDelayMs > 0) {
    await delay(initialDelayMs);
  }

  let expected = '';
  for (const char of chars) {
    expected += char + char.toUpperCase();
    const replied = output.contains(expected);
    await shell.input(char);
    await replied;
  }
}
