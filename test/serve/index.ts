import { Aliases, parse, tokenize } from '@jupyterlite/cockle';
import { shell_setup_empty, shell_setup_simple } from './shell_setup';

async function setup() {
  const cockle = {
    Aliases,
    parse,
    shell_setup_empty,
    shell_setup_simple,
    tokenize
  };

  // @ts-expect-error Assigning to globalThis.
  globalThis.cockle = cockle;
}

setup();
