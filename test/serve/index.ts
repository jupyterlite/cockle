import { Aliases, parse, tokenize } from '@jupyterlite/cockle';
import { terminalInput } from './input_setup';
import { shell_setup_empty, shell_setup_complex, shell_setup_simple } from './shell_setup';

async function setup() {
  const cockle = {
    Aliases,
    parse,
    shell_setup_complex,
    shell_setup_empty,
    shell_setup_simple,
    terminalInput,
    tokenize
  };

  (globalThis as any).cockle = cockle;
}

setup();
