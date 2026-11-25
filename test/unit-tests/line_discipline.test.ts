import { ansi } from '../../src/ansi';
import { LineDiscipline } from '../../src/line_discipline';
import { PosixSignal } from '../../src/posix_signal';
import { Termios } from '../../src/termios';

const { ControlCharacter, InputFlag, LocalFlag, OutputFlag } = Termios;

// Control characters of the default termios settings.
const INTR = '\x03'; // Ctrl-C
const EOF = '\x04'; // Ctrl-D
const START = '\x11'; // Ctrl-Q
const STOP = '\x13'; // Ctrl-S
const KILL = '\x15'; // Ctrl-U
const LNEXT = '\x16'; // Ctrl-V
const WERASE = '\x17'; // Ctrl-W
const REPRINT = '\x12'; // Ctrl-R
const SUSP = '\x1a'; // Ctrl-Z
const QUIT = '\x1c'; // Ctrl-\
const ERASE = '\x7f'; // Backspace

const ERASED = '\b \b'; // Sent to the terminal to erase a character.

/**
 * Create a LineDiscipline using the default termios flags, optionally modified, which records
 * everything that it sends to the terminal and the command.
 */
function setup(modify?: (flags: Termios.IFlags) => void) {
  const flags = new Termios.Termios().get();
  modify?.(flags);

  const terminal: string[] = [];
  const command: string[] = [];
  const signals: PosixSignal[] = [];
  const ld = new LineDiscipline({
    termiosFlags: flags,
    toTerminal: text => terminal.push(text),
    toCommand: chars => command.push(chars),
    signal: signal => signals.push(signal)
  });

  return { ld, flags, command, signals, terminal: () => terminal.join('') };
}

describe('LineDiscipline', () => {
  describe('output', () => {
    test('should map NL to CR-NL if ONLCR', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('a\nb');
      expect(terminal()).toBe('a\r\nb');
    });

    test('should not map NL if not ONLCR', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag = OutputFlag.OPOST));
      ld.fromCommand('a\nb');
      expect(terminal()).toBe('a\nb');
    });

    test('should not process output if not OPOST', () => {
      const { ld, terminal } = setup(
        flags => (flags.c_oflag = OutputFlag.ONLCR | OutputFlag.OLCUC)
      );
      ld.fromCommand('a\nb');
      expect(terminal()).toBe('a\nb');
    });

    test('should map CR to NL if OCRNL', () => {
      const { ld, terminal } = setup(
        flags => (flags.c_oflag = OutputFlag.OPOST | OutputFlag.OCRNL)
      );
      ld.fromCommand('a\rb');
      expect(terminal()).toBe('a\nb');
    });

    test('should map lower case to upper case if OLCUC', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('aBc1');
      expect(terminal()).toBe('ABC1');
    });

    test('should expand tabs to spaces if TABDLY', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.TABDLY));
      ld.fromCommand('a\tb');
      expect(terminal()).toBe('a       b');
    });

    test('should not expand tabs if not TABDLY', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('a\tb');
      expect(terminal()).toBe('a\tb');
    });

    test('should not output CR at column 0 if ONOCR', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.ONOCR));
      ld.fromCommand('\ra\rb');
      expect(terminal()).toBe('a\rb');
    });

    test('should output CR at column 0 if not ONOCR', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('\ra\rb');
      expect(terminal()).toBe('\ra\rb');
    });

    test('should not process escape sequences', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('\x1b[31mred\x1b[0m');
      expect(terminal()).toBe('\x1b[31mRED\x1b[0m');
    });

    test('should not process an escape sequence split across writes', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('\x1b[3');
      ld.fromCommand('1mx');
      expect(terminal()).toBe('\x1b[31mX');
    });

    test('should not process single shift three escape sequence', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('\x1bOax');
      expect(terminal()).toBe('\x1bOaX');
    });

    test('should not process operating system command split across writes', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('\x1b]0;ti');
      ld.fromCommand('tle\x1b');
      ld.fromCommand('\\x');
      expect(terminal()).toBe('\x1b]0;title\x1b\\X');
    });

    test('should not process operating system command ending with BEL', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('\x1b]0;title\x07x');
      expect(terminal()).toBe('\x1b]0;title\x07X');
    });

    test('should not process operating system command ending with ESC \\', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag |= OutputFlag.OLCUC));
      ld.fromCommand('\x1b]0;title\x1b\\x');
      expect(terminal()).toBe('\x1b]0;title\x1b\\X');
    });
  });

  describe('freshLine', () => {
    test('should do nothing at the start of a line', () => {
      const { ld, terminal } = setup();
      ld.freshLine();
      expect(terminal()).toBe('');
    });

    test('should start a new line after text', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('abc');
      ld.freshLine();
      expect(terminal()).toBe('abc\r\n');
    });

    test('should do nothing after text ending with a new line', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('abc\n');
      ld.freshLine();
      expect(terminal()).toBe('abc\r\n');
    });

    test('should ignore escape sequences', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('\x1b[31mabc\n\x1b[0m');
      ld.freshLine();
      expect(terminal()).toBe('\x1b[31mabc\r\n\x1b[0m');
    });

    test('should ignore escape sequences with intermediate bytes', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('abc\n\x1b(B');
      ld.freshLine();
      expect(terminal()).toBe('abc\r\n\x1b(B');
    });

    test('should start a new line after echoed input', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal('ab');
      ld.freshLine();
      expect(terminal()).toBe('ab\r\n');
    });

    test('should do nothing after cursor home', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('abc' + ansi.cursorHome);
      ld.freshLine();
      expect(terminal()).toBe('abc' + ansi.cursorHome);
    });

    test('should restore column when alternative buffer is disabled', () => {
      const { ld, terminal } = setup();
      const output = 'ab' + ansi.enableAlternativeBuffer + 'xyz\n' + ansi.disableAlternativeBuffer;
      ld.fromCommand(output);
      ld.freshLine();
      expect(terminal()).toBe(
        'ab' + ansi.enableAlternativeBuffer + 'xyz\r\n' + ansi.disableAlternativeBuffer + '\r\n'
      );
    });

    test('should restore column 0 when alternative buffer is disabled', () => {
      const { ld, terminal } = setup();
      const output = ansi.enableAlternativeBuffer + 'xyz' + ansi.disableAlternativeBuffer;
      ld.fromCommand(output);
      ld.freshLine();
      expect(terminal()).toBe(output);
    });

    test('should use column 0 after NL if ONLRET', () => {
      const { ld, terminal } = setup(
        flags => (flags.c_oflag = OutputFlag.OPOST | OutputFlag.ONLRET)
      );
      ld.fromCommand('a\n');
      ld.freshLine();
      expect(terminal()).toBe('a\n');
    });

    test('should not use column 0 after NL if neither ONLCR nor ONLRET', () => {
      const { ld, terminal } = setup(flags => (flags.c_oflag = OutputFlag.OPOST));
      ld.fromCommand('a\n');
      ld.freshLine();
      expect(terminal()).toBe('a\n\n');
    });

    test('should use column 0 after CR if OCRNL and ONLRET', () => {
      const { ld, terminal } = setup(
        flags => (flags.c_oflag = OutputFlag.OPOST | OutputFlag.OCRNL | OutputFlag.ONLRET)
      );
      ld.fromCommand('ab\r');
      ld.freshLine();
      expect(terminal()).toBe('ab\n');
    });

    test('should stay at column 0 after backspace at the start of a line', () => {
      const { ld, terminal } = setup();
      ld.fromCommand('\b');
      ld.freshLine();
      expect(terminal()).toBe('\b');
    });
  });

  describe('canonical input', () => {
    test('should send a line to the command when it is complete', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('a');
      ld.fromTerminal('b');
      expect(command).toEqual([]);
      ld.fromTerminal('\r');
      expect(command).toEqual(['ab\n']);
      expect(terminal()).toBe('ab\r\n');
    });

    test('should send multiple lines separately', () => {
      const { ld, command } = setup();
      ld.fromTerminal('ab\rcd\re');
      expect(command).toEqual(['ab\n', 'cd\n']);
    });

    test('should not map CR to NL if not ICRNL', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_iflag &= ~InputFlag.ICRNL));
      ld.fromTerminal('a\r');
      expect(command).toEqual([]);
      ld.fromTerminal('\n');
      expect(command).toEqual(['a\r\n']);
      expect(terminal()).toBe('a^M\r\n');
    });

    test('should map NL to CR if INLCR', () => {
      const { ld, command } = setup(flags => (flags.c_iflag |= InputFlag.INLCR));
      ld.fromTerminal('a\n');
      expect(command).toEqual([]);
      ld.fromTerminal('\r');
      expect(command).toEqual(['a\r\n']);
    });

    test('should ignore CR if IGNCR', () => {
      const { ld, command } = setup(flags => (flags.c_iflag |= InputFlag.IGNCR));
      ld.fromTerminal('a\rb\n');
      expect(command).toEqual(['ab\n']);
    });

    test('should not echo if not ECHO', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHO));
      ld.fromTerminal('ab\r');
      expect(command).toEqual(['ab\n']);
      expect(terminal()).toBe('');
    });

    test('should echo only NL if ECHONL and not ECHO', () => {
      const { ld, command, terminal } = setup(flags => {
        flags.c_lflag &= ~LocalFlag.ECHO;
        flags.c_lflag |= LocalFlag.ECHONL;
      });
      ld.fromTerminal('ab\r');
      expect(command).toEqual(['ab\n']);
      expect(terminal()).toBe('\r\n');
    });

    test('should echo control characters as ^X if ECHOCTL', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal('\x01\x1b\t');
      expect(terminal()).toBe('^A^[\t');
    });

    test('should echo control characters unchanged if not ECHOCTL', () => {
      const { ld, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHOCTL));
      ld.fromTerminal('\x01');
      expect(terminal()).toBe('\x01');
    });

    test('should erase previous character on VERASE', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('ab' + ERASE);
      expect(terminal()).toBe('ab' + ERASED);
      ld.fromTerminal('\r');
      expect(command).toEqual(['a\n']);
    });

    test('should ignore VERASE on an empty line', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal(ERASE);
      expect(terminal()).toBe('');
      expect(command).toEqual([]);
    });

    test('should not erase a previous line', () => {
      const { ld, command } = setup();
      ld.fromTerminal('ab\r' + ERASE + 'c\r');
      expect(command).toEqual(['ab\n', 'c\n']);
    });

    test('should erase both characters of an echoed control character', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal('\x01' + ERASE);
      expect(terminal()).toBe('^A' + ERASED + ERASED);
    });

    test('should echo the erase character if not ECHOE', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHOE));
      ld.fromTerminal('a' + ERASE);
      expect(terminal()).toBe('a^?');
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should show erased characters if ECHOPRT', () => {
      const { ld, terminal } = setup(flags => (flags.c_lflag |= LocalFlag.ECHOPRT));
      ld.fromTerminal('ab' + ERASE + ERASE + 'c');
      expect(terminal()).toBe('ab\\ba/c');
    });

    test('should erase a tab', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('a\t' + ERASE);
      expect(terminal()).toBe('a\t' + '\b'.repeat(7));
      ld.fromTerminal('\r');
      expect(command).toEqual(['a\n']);
    });

    test('should erase a surrogate pair together', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('🎉' + ERASE);
      expect(terminal()).toBe('🎉' + ERASED);
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should erase previous word on VWERASE', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('foo bar' + WERASE);
      expect(terminal()).toBe('foo bar' + ERASED.repeat(3));
      ld.fromTerminal('\r');
      expect(command).toEqual(['foo \n']);
    });

    test('should erase trailing spaces and previous word on VWERASE', () => {
      const { ld, command } = setup();
      ld.fromTerminal('foo ' + WERASE + '\r');
      expect(command).toEqual(['\n']);
    });

    test('should erase line on VKILL', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('abc' + KILL);
      expect(terminal()).toBe('abc' + ERASED.repeat(3));
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should echo the kill character and NL on VKILL if not ECHOKE', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHOKE));
      ld.fromTerminal('abc' + KILL);
      expect(terminal()).toBe('abc^U\r\n');
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should send end-of-file on VEOF on an empty line', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal(EOF);
      expect(command).toEqual(['']);
      expect(terminal()).toBe('');
    });

    test('should send partial line on VEOF, then end-of-file', () => {
      const { ld, command } = setup();
      ld.fromTerminal('ab' + EOF);
      expect(command).toEqual(['ab']);
      ld.fromTerminal(EOF);
      expect(command).toEqual(['ab', '']);
    });

    test('should send a line ending with VEOL', () => {
      const { ld, command, terminal } = setup(
        flags => (flags.c_cc[ControlCharacter.VEOL] = ';'.charCodeAt(0))
      );
      ld.fromTerminal('ab;c');
      expect(command).toEqual(['ab;']);
      expect(terminal()).toBe('ab;c');
    });

    test('should treat the character after VLNEXT as literal', () => {
      const { ld, command, signals, terminal } = setup();
      ld.fromTerminal(LNEXT + INTR);
      expect(terminal()).toBe('^\b^C');
      ld.fromTerminal('\r');
      expect(command).toEqual([INTR + '\n']);
      expect(signals).toEqual([]);
    });

    test('should reprint the line on VREPRINT', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('ab' + REPRINT);
      expect(terminal()).toBe('ab^R\r\nab');
      ld.fromTerminal('\r');
      expect(command).toEqual(['ab\n']);
    });

    test('should strip 8th bit if ISTRIP', () => {
      const { ld, command } = setup(flags => (flags.c_iflag |= InputFlag.ISTRIP));
      ld.fromTerminal('á\r');
      expect(command).toEqual(['a\n']);
    });

    test('should map upper case to lower case if IUCLC', () => {
      const { ld, command } = setup(flags => (flags.c_iflag |= InputFlag.IUCLC));
      ld.fromTerminal('AbC\r');
      expect(command).toEqual(['abc\n']);
    });

    test('should treat digits and underscore as part of a word on VWERASE', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('foo a_1' + WERASE);
      expect(terminal()).toBe('foo a_1' + ERASED.repeat(3));
      ld.fromTerminal('\r');
      expect(command).toEqual(['foo \n']);
    });

    test('should not echo VEOL if not ECHO', () => {
      const { ld, command, terminal } = setup(flags => {
        flags.c_cc[ControlCharacter.VEOL] = ';'.charCodeAt(0);
        flags.c_lflag &= ~LocalFlag.ECHO;
      });
      ld.fromTerminal('ab;');
      expect(command).toEqual(['ab;']);
      expect(terminal()).toBe('');
    });

    test('should send VWERASE and VREPRINT to the command if not IEXTEN', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.IEXTEN));
      ld.fromTerminal('ab' + WERASE + REPRINT + '\r');
      expect(command).toEqual(['ab' + WERASE + REPRINT + '\n']);
      expect(terminal()).toBe('ab^W^R\r\n');
    });

    test('should erase line on VKILL without echo if not ECHO', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHO));
      ld.fromTerminal('abc' + KILL + 'd\r');
      expect(command).toEqual(['d\n']);
      expect(terminal()).toBe('');
    });

    test('should echo the kill character without NL on VKILL if not ECHOK', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHOK));
      ld.fromTerminal('abc' + KILL);
      expect(terminal()).toBe('abc^U');
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should erase on VERASE without echo if not ECHO', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHO));
      ld.fromTerminal('ab' + ERASE + ERASE + 'c\r');
      expect(command).toEqual(['c\n']);
      expect(terminal()).toBe('');
    });

    test('should erase a tab that follows a tab', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal('a\t\t' + ERASE);
      expect(terminal()).toBe('a\t\t' + '\b'.repeat(8));
      ld.fromTerminal('\r');
      expect(command).toEqual(['a\t\n']);
    });

    test('should erase a tab that follows a control character if ECHOCTL', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal('\x01\t' + ERASE);
      expect(terminal()).toBe('^A\t' + '\b'.repeat(6));
    });

    test('should erase a tab that follows a control character if not ECHOCTL', () => {
      const { ld, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHOCTL));
      ld.fromTerminal('\x01\t' + ERASE);
      expect(terminal()).toBe('\x01\t' + '\b'.repeat(8));
    });

    test('should erase a tab that follows a surrogate pair', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal('🎉\t' + ERASE);
      expect(terminal()).toBe('🎉\t' + '\b'.repeat(7));
    });

    test('should erase a control character without echo if not ECHOCTL', () => {
      const { ld, command, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHOCTL));
      ld.fromTerminal('\x01' + ERASE);
      expect(terminal()).toBe('\x01');
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should not echo VLNEXT if not ECHO', () => {
      const { ld, command, signals, terminal } = setup(flags => (flags.c_lflag &= ~LocalFlag.ECHO));
      ld.fromTerminal(LNEXT + INTR + '\r');
      expect(terminal()).toBe('');
      expect(command).toEqual([INTR + '\n']);
      expect(signals).toEqual([]);
    });

    test('should not echo VLNEXT if not ECHOCTL', () => {
      const { ld, command, signals, terminal } = setup(
        flags => (flags.c_lflag &= ~LocalFlag.ECHOCTL)
      );
      ld.fromTerminal(LNEXT + INTR);
      expect(terminal()).toBe(INTR);
      ld.fromTerminal('\r');
      expect(command).toEqual([INTR + '\n']);
      expect(signals).toEqual([]);
    });
  });

  describe('non-canonical input', () => {
    const nonCanonical = (flags: Termios.IFlags) => (flags.c_lflag &= ~LocalFlag.ICANON);

    test('should send input to the command immediately', () => {
      const { ld, command, terminal } = setup(nonCanonical);
      ld.fromTerminal('a');
      expect(command).toEqual(['a']);
      ld.fromTerminal('bc');
      expect(command).toEqual(['a', 'bc']);
      expect(terminal()).toBe('abc');
    });

    test('should map CR to NL if ICRNL', () => {
      const { ld, command } = setup(nonCanonical);
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should send erase and end-of-file characters to the command', () => {
      const { ld, command, terminal } = setup(nonCanonical);
      ld.fromTerminal('a' + ERASE);
      ld.fromTerminal(EOF);
      expect(command).toEqual(['a' + ERASE, EOF]);
      expect(terminal()).toBe('a^?^D');
    });
  });

  describe('signals', () => {
    test('should send SIGINT on VINTR and discard the line', () => {
      const { ld, command, signals, terminal } = setup();
      ld.fromTerminal('ab' + INTR);
      expect(signals).toEqual([PosixSignal.SIGINT]);
      expect(terminal()).toBe('ab^C');
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should send VQUIT and VSUSP to the command without a signal', () => {
      const { ld, command, signals, terminal } = setup();
      ld.fromTerminal(QUIT + SUSP + '\r');
      expect(signals).toEqual([]);
      expect(command).toEqual([QUIT + SUSP + '\n']);
      expect(terminal()).toBe('^\\^Z\r\n');
    });

    test('should not discard the line if NOFLSH', () => {
      const { ld, command, signals } = setup(flags => (flags.c_lflag |= LocalFlag.NOFLSH));
      ld.fromTerminal('ab' + INTR + '\r');
      expect(signals).toEqual([PosixSignal.SIGINT]);
      expect(command).toEqual(['ab\n']);
    });

    test('should send the character to the command if not ISIG', () => {
      const { ld, command, signals } = setup(flags => (flags.c_lflag &= ~LocalFlag.ISIG));
      ld.fromTerminal(INTR + '\r');
      expect(signals).toEqual([]);
      expect(command).toEqual([INTR + '\n']);
    });

    test('should send signal in non-canonical mode', () => {
      const { ld, command, signals } = setup(flags => (flags.c_lflag &= ~LocalFlag.ICANON));
      ld.fromTerminal(INTR);
      expect(signals).toEqual([PosixSignal.SIGINT]);
      expect(command).toEqual([]);
    });

    test('should send SIGINT on VINTR if not IXON', () => {
      const { ld, signals, terminal } = setup(flags => (flags.c_iflag &= ~InputFlag.IXON));
      ld.fromTerminal('ab' + INTR);
      expect(signals).toEqual([PosixSignal.SIGINT]);
      expect(terminal()).toBe('ab^C');
    });
  });

  describe('flow control', () => {
    test('should stop output on VSTOP and restart on VSTART', () => {
      const { ld, command, terminal } = setup();
      ld.fromTerminal(STOP);
      ld.fromCommand('abc');
      ld.fromTerminal('x');
      expect(terminal()).toBe('');

      ld.fromTerminal(START);
      expect(terminal()).toBe('abcx');

      // VSTOP and VSTART are not sent to the command.
      ld.fromTerminal('\r');
      expect(command).toEqual(['x\n']);
    });

    test('should restart output on any character if IXANY', () => {
      const { ld, terminal } = setup(flags => (flags.c_iflag |= InputFlag.IXANY));
      ld.fromTerminal(STOP);
      ld.fromCommand('abc');
      expect(terminal()).toBe('');
      ld.fromTerminal('x');
      expect(terminal()).toBe('abcx');
    });

    test('should restart output on a signal, discarding stopped output', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal(STOP);
      ld.fromCommand('abc');
      ld.fromTerminal(INTR);
      expect(terminal()).toBe('^C');
    });

    test('should restart output when IXON is turned off', () => {
      const { ld, flags, terminal } = setup();
      ld.fromTerminal(STOP);
      ld.fromCommand('abc');
      expect(terminal()).toBe('');

      const newFlags = Termios.cloneFlags(flags);
      newFlags.c_iflag &= ~InputFlag.IXON;
      ld.setTermios(newFlags);
      expect(terminal()).toBe('abc');
    });

    test('should not stop output if not IXON', () => {
      const { ld, terminal } = setup(flags => (flags.c_iflag &= ~InputFlag.IXON));
      ld.fromTerminal(STOP);
      ld.fromCommand('abc');
      expect(terminal()).toBe('^Sabc');
    });
  });

  describe('setTermios', () => {
    test('should send a partial line to the command when canonical mode is turned off', () => {
      const { ld, command, flags } = setup();
      ld.fromTerminal('ab');
      expect(command).toEqual([]);

      const newFlags = Termios.cloneFlags(flags);
      newFlags.c_lflag &= ~LocalFlag.ICANON;
      ld.setTermios(newFlags);
      expect(command).toEqual(['ab']);
    });
  });

  describe('reset', () => {
    test('should return and discard a partial line', () => {
      const { ld, command } = setup();
      ld.fromTerminal('ab');
      expect(ld.reset()).toBe('ab');
      ld.fromTerminal('\r');
      expect(command).toEqual(['\n']);
    });

    test('should return an empty string if there is no partial line', () => {
      const { ld } = setup();
      ld.fromTerminal('ab\r');
      expect(ld.reset()).toBe('');
    });

    test('should restart stopped output', () => {
      const { ld, terminal } = setup();
      ld.fromTerminal(STOP);
      ld.fromCommand('abc');
      ld.reset();
      expect(terminal()).toBe('abc');
    });
  });
});
