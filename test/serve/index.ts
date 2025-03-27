import { OutputFlag, Termios } from '@jupyterlite/cockle';
import { delay, terminalInput } from './input_setup';
import { keys } from './keys';
import { shellSetupEmpty, shellSetupComplex, shellSetupSimple } from './shell_setup';

async function setup() {
  const cockle = {
    OutputFlag,
    Termios,
    delay,
    keys,
    shellSetupComplex,
    shellSetupEmpty,
    shellSetupSimple,
    terminalInput
  };

  (globalThis as any).cockle = cockle;
}

setup();
