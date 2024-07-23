import { shell_setup_empty } from './shell_setup';

describe('history', () => {
  it('should be stored', async () => {
    const { shell, output } = await shell_setup_empty();

    await shell._runCommands('cat');
    await shell._runCommands('echo');
    await shell._runCommands('ls');
    output.clear();

    await shell._runCommands('history');
    expect(output.text).toEqual('    0  cat\r\n    1  echo\r\n    2  ls\r\n    3  history\r\n');
  });

  it('should limit storage to max size', async () => {
    const { shell, output } = await shell_setup_empty();
    const { history } = shell;
    history.setMaxSize(5);

    await shell._runCommands('cat');
    await shell._runCommands('echo');
    await shell._runCommands('ls');
    await shell._runCommands('uname');
    await shell._runCommands('uniq');
    output.clear();

    await shell._runCommands('history');
    expect(output.text).toEqual(
      '    0  echo\r\n    1  ls\r\n    2  uname\r\n    3  uniq\r\n    4  history\r\n'
    );
  });

  it('should clip history when reduce max size', async () => {
    const { shell, output } = await shell_setup_empty();
    const { history } = shell;
    history.setMaxSize(5);

    await shell._runCommands('cat');
    await shell._runCommands('echo');
    await shell._runCommands('ls');
    await shell._runCommands('uname');
    await shell._runCommands('uniq');
    output.clear();

    history.setMaxSize(3);

    await shell._runCommands('history');
    expect(output.text).toEqual('    0  uname\r\n    1  uniq\r\n    2  history\r\n');
  });

  it('should ignore duplicates', async () => {
    const { shell, output } = await shell_setup_empty();

    await shell._runCommands('cat');
    await shell._runCommands('cat');
    output.clear();

    await shell._runCommands('history');
    expect(output.text).toEqual('    0  cat\r\n    1  history\r\n');
  });

  it('should ignore commands starting with whitespace', async () => {
    const { shell, output } = await shell_setup_empty();

    await shell._runCommands(' ls');
    output.clear();

    await shell._runCommands('history');
    expect(output.text).toEqual('    0  history\r\n');
  });

  it('should rerun previous command using !index syntax, negative and positive', async () => {
    const { shell, output } = await shell_setup_empty();

    await shell._runCommands('cat');
    await shell._runCommands('echo hello');
    await shell._runCommands('ls');
    output.clear();

    await shell._runCommands('!-2');
    expect(output.text).toEqual('hello\r\n');
    output.clear();

    await shell._runCommands('!1');
    expect(output.text).toEqual('hello\r\n');
  });

  it('should handle !index out of bounds', async () => {
    const { shell, output } = await shell_setup_empty();
    const { history } = shell;

    await shell._runCommands('ls');
    output.clear();

    await shell._runCommands('!1');
    expect(output.text).toMatch(/!1: event not found/);
  });

  it('should scroll up and down', async () => {
    const { shell, output } = await shell_setup_empty();

    await shell._runCommands('cat');
    await shell._runCommands('echo hello');
    await shell._runCommands('ls');
    output.clear();

    const upArrow = '\x1B[A';
    const downArrow = '\x1B[B';

    await shell.input(upArrow);
    await shell.input(upArrow);
    expect(output.text).toMatch(/echo hello$/);
    output.clear();

    await shell.input(upArrow);
    expect(output.text).toMatch(/cat$/);
    output.clear();

    await shell.input(upArrow);
    expect(output.text).toMatch(/cat$/);
    output.clear();

    await shell.input(downArrow);
    expect(output.text).toMatch(/echo hello$/);
    output.clear();

    await shell.input(downArrow);
    expect(output.text).toMatch(/ls$/);
    output.clear();

    await shell.input(downArrow);
    expect(output.text).toMatch(/ $/);
  });
});
