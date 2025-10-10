import { delay, ShellManager, Termios } from '@jupyterlite/cockle';
import { externalCommand } from './external_command';
import { externalRun, externalTabComplete } from './external_command_tab';
import { terminalInput } from './input_setup';
import { keys } from './keys';
import { shellSetupComplex, shellSetupEmpty, shellSetupSimple } from './shell_setup';

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
