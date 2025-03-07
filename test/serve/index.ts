import { Aliases, OutputFlag, Termios, parse, tokenize } from '@jupyterlite/cockle';
import { terminalInput } from './input_setup';
import { keys } from './keys';
import { shellSetupEmpty, shellSetupComplex, shellSetupSimple } from './shell_setup';

async function setup() {
  const cockle = {
    Aliases,
    OutputFlag,
    Termios,
    keys,
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
