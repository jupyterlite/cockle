import { Shell } from '@jupyterlite/cockle';

/**
 * Helper to provide terminal input whilst a command is running.
 * Pass EOT (ASCII code 4) to finish.
 * There is an optional delay in milliseconds to wait before starting the terminal input to allow
 * the command to start.
 */
export async function terminalInput(
  shell: Shell,
  chars: string[],
  initialDelayMs: number = 10
): Promise<void> {
  if (initialDelayMs > 0) {
    await new Promise(f => setTimeout(f, initialDelayMs));
  }

  for (const char of chars) {
    await shell.input(char);
  }
}
