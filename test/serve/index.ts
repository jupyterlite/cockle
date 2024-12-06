import { Aliases, OutputFlag, Termios, parse, tokenize } from '@jupyterlite/cockle';
import { terminalInput } from './input_setup';
import { shellSetupEmpty, shellSetupComplex, shellSetupSimple } from './shell_setup';

async function setup() {
  const cockle = {
    Aliases,
    OutputFlag,
    Termios,
    parse,
    shellSetupComplex,
    shellSetupEmpty,
    shellSetupSimple,
    terminalInput,
    tokenize
  };

  (globalThis as any).cockle = cockle;
}

setup();
