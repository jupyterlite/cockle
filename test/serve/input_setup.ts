import { delay, Shell } from '@jupyterlite/cockle';

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
