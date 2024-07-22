import { shell_setup_empty, shell_setup_simple } from '../shell_setup';

describe('ls command', () => {
  it('should write to stdout', async () => {
    const { shell, output } = await shell_setup_simple();
    await shell._runCommands('ls');
    expect(output.text).toEqual('dirA  file1  file2\r\n');

    output.clear();
    await shell._runCommands('ls -a');
    expect(output.text).toEqual('.  ..  dirA  file1  file2\r\n');
  });

  it('should handle empty listing', async () => {
    const { shell, output } = await shell_setup_empty();
    await shell._runCommands('ls');
    expect(output.text).toEqual('');
  });

  it('should vary with COLUMNS', async () => {
    const { shell, output, FS } = await shell_setup_simple();
    FS.writeFile('a', '');
    FS.writeFile('bb', '');
    FS.writeFile('ccc', '');
    FS.writeFile('dddd', '');
    FS.writeFile('eeeee', '');
    FS.writeFile('ffffff', '');
    FS.writeFile('ggggg', '');
    FS.writeFile('hhhh', '');
    FS.writeFile('iii', '');
    FS.writeFile('jj', '');
    FS.writeFile('k', '');

    await shell.setSize(10, 50);
    await shell._runCommands('ls');
    expect(output.text).toEqual(
      'a   ccc   dirA	 ffffff  file2	hhhh  jj\r\nb' + 'b  dddd  eeeee  file1	 ggggg	iii   k\r\n'
    );
    output.clear();

    await shell.setSize(10, 40);
    await shell._runCommands('ls');
    expect(output.text).toEqual(
      'a    dddd   ffffff  ggggg  jj\r\n' +
        'bb   dirA   file1   hhhh   k\r\n' +
        'ccc  eeeee  file2   iii\r\n'
    );
    output.clear();

    await shell.setSize(10, 20);
    await shell._runCommands('ls');
    expect(output.text).toEqual(
      'a     eeeee   hhhh\r\n' +
        'bb    ffffff  iii\r\n' +
        'ccc   file1   jj\r\n' +
        'dddd  file2   k\r\n' +
        'dirA  ggggg\r\n'
    );
  });
});
