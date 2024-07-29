import { Aliases, CommandRegistry, FileInput, TerminalInput, parse, tokenize } from '../../src';
import { MockTerminalStdin } from './input_setup';
import { shell_setup_empty, shell_setup_simple } from './shell_setup';

async function setup() {
  // Attach required functions and classes to globalThis so that they can be accessed
  // from within page.evaluate calls in browser context.
  const cockle = {
    Aliases,
    CommandRegistry,
    FileInput,
    MockTerminalStdin,
    TerminalInput,
    parse,
    tokenize,
    shell_setup_empty,
    shell_setup_simple
  };

  // @ts-expect-error Assigning to globalThis.
  globalThis.cockle = cockle;
}

setup();
