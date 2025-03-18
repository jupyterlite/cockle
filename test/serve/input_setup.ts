import { Shell } from '@jupyterlite/cockle';

export async function delay(milliseconds: number = 10): Promise<void> {
  await new Promise(f => setTimeout(f, milliseconds));
}

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
  }
}
