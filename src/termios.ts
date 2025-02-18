// Termios settings
// https://man7.org/linux/man-pages/man3/termios.3.html

export enum InputFlag {
  ISTRIP = 0x0020, // Strip off 8th bit
  INLCR = 0x0040, // Map NL to CR on input
  IGNCR = 0x0080, // Ignore CR on input
  ICRNL = 0x0100, // Map CR to NL on input
  IUCLC = 0x0200, // Map uppercase to lowercase on input
  IXON = 0x0400, // Enable XON/XOFF flow control on output
  IXANY = 0x0800, // Enable any character to restart output
  IMAXBEL = 0x2000, // Ring bell when input queue is full
  IUTF8 = 0x4000 // Input is UTF8
}

export enum OutputFlag {
  OPOST = 0x0001, // Enable implementation-defined output processing
  OLCUC = 0x0002, // Map lowercase to uppercase on output
  ONLCR = 0x0004, // Map NL to CR-NL on output
  OCRNL = 0x0008, // Map CR to NL on output
  ONOCR = 0x0010, // Don't output CR at column 0
  ONLRET = 0x0020, // NL performs CR on output
  TABDLY = 0x1800 // Horizontal tab delay mask
}

export enum LocalFlag {
  ISIG = 0x0001, // Enable signals
  ICANON = 0x0002, // Enable canonical mode on input
  ECHO = 0x0008, // Enable echo
  ECHOE = 0x0010, // ERASE character erases preceding character
  ECHOK = 0x0020, // KILL character erases current line
  ECHONL = 0x0040, // Echo NL even if ECHO not set
  NOFLSH = 0x0080, // Disable flush after interrupt or quite
  ECHOCTL = 0x0200, // Terminal special characters are echoed
  ECHOPRT = 0x0400, // Characters are printed as they are erased
  ECHOKE = 0x0800, // KILL is echoed by erasing each character on the line
  IEXTEN = 0x8000 // Enable implementation-defined input processing
}

export enum ControlCharacter {
  VINTR = 0, // INTR (interrupt) character
  VQUIT = 1, // QUIT character
  VERASE = 2, // ERASE character
  VKILL = 3, // KILL character
  VEOF = 4, // EOF (end-of-file) character
  VTIME = 5, // Timeout for non-canonical read
  VMIN = 6, // Minimum number of characters for non-canonical read
  VSWTCH = 7, // SWTCH (switch) character
  VSTART = 8, // Start character restarts output after stopped by Stop character
  VSTOP = 9, // Stop character to stop output until Start character typed
  VSUSP = 10, // SUSP (suspend) character
  VEOL = 11, // Additional EOL (end-of-line) character
  VREPRINT = 12, // Reprint unread characters
  VDISCARD = 13, // Toggle start/stop discards pending input
  VWERASE = 14, // Word erase
  VLNEXT = 15, // Literal next character
  VEOL2 = 16 // Yet another EOL character
}

// This is the interface used by emscripten.
export interface ITermios {
  c_iflag: InputFlag;
  c_oflag: OutputFlag;
  c_cflag: number;
  c_lflag: LocalFlag;
  c_cc: number[];
}

export class Termios implements ITermios {
  clone(): ITermios {
    return {
      c_iflag: this.c_iflag,
      c_oflag: this.c_oflag,
      c_cflag: this.c_cflag,
      c_lflag: this.c_lflag,
      c_cc: [...this.c_cc] // Shallow copy
    };
  }

  // Log to console for debug purposes.
  log(title: string) {
    const enumHelper = (enumType: any, name: string, enumValue: any) => {
      const s: string[] = [];
      for (const [k, v] of Object.entries(enumType).filter(([k, v]) => k[0].match(/\D/))) {
        if ((enumValue & (v as number)) > 0) {
          s.push(k);
        }
      }
      return `  ${name} = ${enumValue} 0x${enumValue.toString(16)} = ${s.join(' ')}`;
    };

    const log: string[] = ['Cockle ' + title + ':'];
    log.push(enumHelper(InputFlag, 'c_iflag', this.c_iflag));
    log.push(enumHelper(OutputFlag, 'c_oflag', this.c_oflag));
    log.push(`  c_cflag = ${this.c_cflag} 0x${this.c_cflag.toString(16)}`);
    log.push(enumHelper(LocalFlag, 'c_lflag', this.c_lflag));
    log.push(`  c_cc = ${this.c_cc}`);
    console.log(log.join('\n'));
  }

  static newDefaultWasm(): Termios {
    const ret = new Termios();
    ret.setDefaultWasm();
    return ret;
  }

  set(iTermios: ITermios): void {
    this.c_iflag = iTermios.c_iflag;
    this.c_oflag = iTermios.c_oflag;
    this.c_cflag = iTermios.c_cflag;
    this.c_lflag = iTermios.c_lflag;
    this.c_cc = [...iTermios.c_cc]; // Shallow copy.
    this.log('Termios set');
  }

  setDefaultWasm(): void {
    // Default termios from emscripten-compiled code.
    this.c_iflag = InputFlag.IUTF8 | InputFlag.IMAXBEL | InputFlag.IXON | InputFlag.ICRNL; // 25856 = 0x6500
    this.c_oflag = OutputFlag.OPOST | OutputFlag.ONLCR; // 5
    this.c_cflag = 191; // ignored
    this.c_lflag =
      LocalFlag.IEXTEN |
      LocalFlag.ECHOKE |
      LocalFlag.ECHOCTL |
      LocalFlag.ECHOK |
      LocalFlag.ECHOE |
      LocalFlag.ECHO |
      LocalFlag.ICANON |
      LocalFlag.ISIG; // 35387 = 0x8A3B
    this.c_cc = [
      3, // VINTR
      28, // VQUIT
      127, // VERASE
      21, // VKILL
      4, // VEOF
      0, // VTIME
      1, // VMIN
      0, // VSWTCH
      17, // VSTART
      19, // VSTOP
      26, // VSUSP
      0, // VEOL
      18, // VREPRINT
      15, // VDISCARD
      23, // VWERASE
      22, // VLNEXT
      0, // VEOL2
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
    this.log('Termios setDefaultWasm');
  }

  c_iflag: InputFlag = 0 as InputFlag;
  c_oflag: OutputFlag = 0 as OutputFlag;
  c_cflag: number = 0;
  c_lflag: LocalFlag = 0 as LocalFlag;
  c_cc: number[] = [];
}
