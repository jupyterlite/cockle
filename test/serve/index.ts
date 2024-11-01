import { Aliases, parse, tokenize } from '@jupyterlite/cockle';
import { terminalInput } from './input_setup';
import { shellSetupEmpty, shellSetupComplex, shellSetupSimple } from './shell_setup';

async function setup() {
  const cockle = {
    Aliases,
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
