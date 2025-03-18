import { Aliases, OutputFlag, Termios, parse, tokenize } from '@jupyterlite/cockle';
import { delay, terminalInput } from './input_setup';
import { keys } from './keys';
import { shellSetupEmpty, shellSetupComplex, shellSetupSimple } from './shell_setup';

async function setup() {
  const cockle = {
    Aliases,
    OutputFlag,
    Termios,
    delay,
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
