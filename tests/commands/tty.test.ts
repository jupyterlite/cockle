import { shell_setup_empty } from '../shell_setup';

describe('tty command', () => {
  it('should write to stdout', async () => {
    const { shell, output } = await shell_setup_empty();
    await shell._runCommands('tty');
    expect(output.text).toEqual('/dev/tty\r\n');
  });
});
