import type { Aliases } from './aliases';
import { GeneralError } from './error_exit_code';
import type { Token } from './tokenize';
import { hasOpenQuote, isHeredocToken, tokenize } from './tokenize';

const endOfCommand = ';&';
//const ignore_trailing = ";"

export abstract class Node {
  // Return last token and whether it is a command or not.
  abstract lastToken(): [Token | null, boolean];
}

export class CommandNode extends Node {
  constructor(
    readonly name: Token,
    readonly suffix: Token[],
    readonly redirects?: RedirectNode[]
  ) {
    super();
  }

  lastToken(): [Token | null, boolean] {
    if (this.redirects && this.redirects.length > 0) {
      return this.redirects[this.redirects.length - 1].lastToken();
    } else if (this.suffix.length > 0) {
      return [this.suffix[this.suffix.length - 1], false];
    } else {
      return [this.name, true];
    }
  }
}

export class PipeNode extends Node {
  // Must be at least 2 commands
  constructor(readonly commands: CommandNode[]) {
    super();
  }

  lastToken(): [Token | null, boolean] {
    if (this.commands.length > 0) {
      return this.commands[this.commands.length - 1].lastToken();
    } else {
      return [null, false];
    }
  }
}

export class RedirectNode extends Node {
  constructor(
    readonly token: Token,
    readonly target: Token
  ) {
    super();
  }

  lastToken(): [Token | null, boolean] {
    return [this.target, false];
  }
}

export function parse(source: string, throwErrors: boolean = true, aliases?: Aliases): Node[] {
  const tokens = tokenize(source, throwErrors, aliases);

  const ret: Node[] = [];
  const stack: CommandNode[] = [];
  let offset: number = -1; // Offset of start of current command, -1 if not in command.
  const n = tokens.length;

  function clearStack() {
    if (stack.length === 1) {
      ret.push(stack[0]);
    } else if (stack.length > 1) {
      ret.push(new PipeNode([...stack]));
    }
    stack.length = 0;
  }

  for (let i = 0; i < n; i++) {
    const token = tokens[i];
    if (offset >= 0) {
      // In command
      if (endOfCommand.includes(token.value)) {
        // Finish current command, ignore endOfCommand token.
        stack.push(_createCommandNode(tokens.slice(offset, i)));
        clearStack();
        offset = -1;
      } else if (token.value === '|') {
        // Finish current command which is in a pipe.
        stack.push(_createCommandNode(tokens.slice(offset, i)));
        offset = -1;
      }
    } else {
      // Not in command
      if (!endOfCommand.includes(token.value)) {
        // Start new command.
        offset = i;
      }
    }
  }

  if (offset >= 0) {
    // Finish last command.
    stack.push(_createCommandNode(tokens.slice(offset, n)));
  }

  clearStack();
  return ret;
}

function _createCommandNode(tokens: Token[]): CommandNode {
  let args = tokens.slice(1);

  // Handle redirects.
  let redirectNodes: RedirectNode[] | undefined;
  const index = args.findIndex(token => _isRedirect(token.value));
  if (index >= 0) {
    redirectNodes = _createRedirectNodes(args.slice(index));
    args = args.slice(0, index);
  }

  return new CommandNode(tokens[0], args, redirectNodes);
}

function _createRedirectNodes(tokens: Token[]): RedirectNode[] {
  const redirectNodes: RedirectNode[] = [];
  while (tokens.length > 0) {
    const token = tokens.shift()!;
    if (!_isRedirect(token.value)) {
      throw new GeneralError(`Expected redirect token not '${token.value}'`);
    }

    if (tokens.length < 1) {
      throw new GeneralError(
        `Redirect '${token.value}' should be followed by a file to redirect to`
      );
    }
    const target = tokens.shift()!;
    redirectNodes.push(new RedirectNode(token, target));
  }
  return redirectNodes;
}

function _isRedirect(str: string): boolean {
  return str.startsWith('>') || str.startsWith('2>') || str.startsWith('<');
}

/**
 * Whether a command is complete (it can be run). Incomplete commands require further input
 * lines: they end with a backslash or a pipe, contain an unterminated quote, or are waiting for
 * the end of a here document.
 */
export function isCommandComplete(source: string, aliases?: Aliases): boolean {
  if (hasOpenQuote(source)) {
    return false;
  }

  const trimmed: string = source.trimEnd();

  // Match a run of one or more backslashes at the end of the input.
  const backslashes: RegExpExecArray | null = /\\+$/.exec(trimmed);
  if (backslashes !== null && backslashes[0].length % 2 === 1) {
    return false;
  }

  if (trimmed.endsWith('|') && !trimmed.endsWith('>|') && !trimmed.endsWith('||')) {
    // A line ending with a pipe continues on the next line.
    return false;
  }

  try {
    return parse(source, false, aliases).every(_heredocsComplete);
  } catch {
    // Invalid commands are complete so that the error is reported when they are run.
    return true;
  }
}

/** Whether all here documents in a node have their bodies so that the node can be run. */
function _heredocsComplete(node: Node): boolean {
  if (node instanceof CommandNode) {
    const redirects: RedirectNode[] = node.redirects ?? [];
    return redirects.every(
      redirect => !isHeredocToken(redirect.token.value) || redirect.token.heredoc !== undefined
    );
  } else if (node instanceof PipeNode) {
    return node.commands.every(_heredocsComplete);
  } else {
    return true;
  }
}
