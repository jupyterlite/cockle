import { delay, ShellManager, Termios } from '@jupyterlite/cockle';
import { terminalInput } from './input_setup';
import { keys } from './keys';
import { shellSetupComplex, shellSetupEmpty, shellSetupSimple } from './shell_setup';
import { externalCommand } from '../../sample-commands/external/external_command';
import {
  externalRun,
  externalTabComplete
} from '../../sample-commands/external/external_command_tab';

async function setup() {
  const shellManager = new ShellManager();

  const externalCommands = [
    { name: 'external-cmd', command: externalCommand },
    { name: 'external-tab', command: externalRun, tabComplete: externalTabComplete }
  ];

  const cockle = {
    Termios,
    delay,
    externalCommands,
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
