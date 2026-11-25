import { delay, ShellManager, Termios } from '@jupyterlite/cockle';
import { terminalInput, terminalInputUpperCaseReply } from './input_setup';
import { keys } from './keys';
import { shellSetupComplex, shellSetupEmpty, shellSetupSimple } from './shell_setup';
import { externalCommand } from '../../sample-commands/external/external_command';
import { externalPagerCommand } from '../../sample-commands/external/external_command_pager';
import {
  externalRun,
  externalTabComplete
} from '../../sample-commands/external/external_command_tab';
import { externalTuiCommand } from '../../sample-commands/external/external_command_tui';

async function setup() {
  const shellManager = new ShellManager();

  const externalCommands = [
    { name: 'external-cmd', command: externalCommand },
    { name: 'external-pager', command: externalPagerCommand },
    { name: 'external-tab', command: externalRun, tabComplete: externalTabComplete },
    { name: 'external-tui', command: externalTuiCommand }
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
    terminalInput,
    terminalInputUpperCaseReply
  };

  (globalThis as any).cockle = cockle;
}

setup();
