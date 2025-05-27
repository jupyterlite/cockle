import { OutputFlag, ShellManager, Termios, delay } from '@jupyterlite/cockle';
import { externalCommand } from './external_command';
import { terminalInput } from './input_setup';
import { keys } from './keys';
import { shellSetupEmpty, shellSetupComplex, shellSetupSimple } from './shell_setup';

async function setup() {
  const shellManager = new ShellManager();

  const cockle = {
    OutputFlag,
    Termios,
    delay,
    externalCommand,
    keys,
    shellManager,
    shellSetupComplex,
    shellSetupEmpty,
    shellSetupSimple,
    terminalInput
  };

  (globalThis as any).cockle = cockle;
}

setup();
