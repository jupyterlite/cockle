import type { Aliases } from './aliases';
import { GeneralError } from './error_exit_code';
import type { Token } from './tokenize';
import { hasOpenQuote, isHeredocToken, isRedirectToken, tokenize } from './tokenize';

/** Operator joining two commands in a list. */
export type Separator = '&&' | '||';
const SEPARATORS: Set<string> = new Set([';', '&', '&&', '||']);

/** Whether a token value separates commands
 * @param value The token value to check.
 * @returns True if the token value is a command separator, false otherwise.
 */
function isSeparator(value: string): boolean {
  return SEPARATORS.has(value);
}

/** Whether a token value is a list operator, i.e. a `Separator`. */
function isListOperator(value: string): value is Separator {
  return value === '&&' || value === '||';
}

export abstract class Node {
  // Return last token and whether it is a command or not.
  abstract lastToken(): [Token | null, boolean];

  declare separator?: Separator;
}

export class CommandNode extends Node {
  constructor(
    readonly name: Token | undefined,
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
      return [this.name ?? null, true];
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
  let separator: Separator | undefined; // Operator joining the next node to the previous one.
  const n = tokens.length;

  function clearStack(separator?: Separator) {
    let node: Node | undefined;
    if (stack.length === 1) {
      node = stack[0];
    } else if (stack.length > 1) {
      node = new PipeNode([...stack]);
    }
    stack.length = 0;
    if (node !== undefined) {
      if (separator !== undefined) {
        node.separator = separator;
      }
      ret.push(node);
    }
  }

  for (let i = 0; i < n; i++) {
    const token = tokens[i];
    if (offset >= 0) {
      // In command
      if (token.value === '|') {
        // Finish current command which is in a pipe.
        stack.push(_createCommandNode(tokens.slice(offset, i)));
        offset = -1;
      } else if (isSeparator(token.value)) {
        // Finish current command, the separator joins the next command to it.
        stack.push(_createCommandNode(tokens.slice(offset, i)));
        clearStack(separator);
        separator = isListOperator(token.value) ? token.value : undefined;
        offset = -1;
      }
    } else {
      // Not in command
      if (!isSeparator(token.value)) {
        // Start new command.
        offset = i;
      }
    }
  }

  if (offset >= 0) {
    // Finish last command.
    stack.push(_createCommandNode(tokens.slice(offset, n)));
  }

  clearStack(separator);
  return ret;
}

function _createCommandNode(tokens: Token[]): CommandNode {
  const args: Token[] = [];
  const redirectNodes: RedirectNode[] = [];
  let name: Token | undefined;

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];
    if (isRedirectToken(token.value)) {
      if (i + 1 >= tokens.length) {
        throw new GeneralError(
          `Redirect '${token.value}' should be followed by a file to redirect to`
        );
      }
      redirectNodes.push(new RedirectNode(token, tokens[++i]));
    } else if (name === undefined) {
      name = token;
    } else {
      args.push(token);
    }
  }

  return new CommandNode(name, args, redirectNodes.length > 0 ? redirectNodes : undefined);
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

  if (trimmed.endsWith('&&') || (trimmed.endsWith('|') && !trimmed.endsWith('>|'))) {
    // A line ending with a pipe or a joining operator continues on the next line.
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
