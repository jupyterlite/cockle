import { Aliases } from "./aliases"
import { Token, tokenize } from "./tokenize"

const endOfCommand = ";&"
//const ignore_trailing = ";"


export abstract class Node {}

export class CommandNode extends Node {
  constructor(readonly name: Token, readonly suffix: Token[], readonly redirects?: RedirectNode[]) {
    super()
  }
}

export class PipeNode extends Node {
  // Must be at least 2 commands
  constructor(readonly commands: CommandNode[]) {
    super()
  }
}

export class RedirectNode extends Node {
  constructor(readonly token: Token, readonly target: Token) {
    super()
  }
}


export function parse(source: string, aliases?: Aliases): Node[] {
  const tokens = tokenize(source, aliases)

  const ret: Node[] = []
  const stack: CommandNode[] = []
  let offset: number = -1  // Offset of start of current command, -1 if not in command.
  const n = tokens.length

  function clearStack() {
    if (stack.length == 1) {
      ret.push(stack[0])
    } else if (stack.length > 1) {
      ret.push(new PipeNode([...stack]))
    }
    stack.length = 0
  }

  for (let i = 0; i < n; i++) {
    const token = tokens[i]
    if (offset >= 0) {  // In command
      if (endOfCommand.includes(token.value)) {
        // Finish current command, ignore endOfCommand token.
        stack.push(_createCommandNode(tokens.slice(offset, i)))
        clearStack()
        offset = -1
      } else if (token.value == "|") {
        // Finish current command which is in a pipe.
        stack.push(_createCommandNode(tokens.slice(offset, i)))
        offset = -1
      }
    } else {  // Not in command
      if (!endOfCommand.includes(token.value)) {
        // Start new command.
        offset = i
      }
    }
  }

  if (offset >= 0) {
    // Finish last command.
    stack.push(_createCommandNode(tokens.slice(offset, n)))
  }

  clearStack()
  return ret
}


function _createCommandNode(tokens: Token[]) {
  let args = tokens.slice(1)

  function isRedirect(str: string): boolean {
    return str.startsWith(">") || str.startsWith("<")
  }

  // Handle redirects.
  const index = args.findIndex((token) => isRedirect(token.value))
  if (index >= 0) {
    // Must support multiple redirects for a single command.
    if (args.length != index + 2) {
      // Need better error handling here.
      throw new Error("Redirect should be followed by file to redirect to")
    }
    const redirect = new RedirectNode(args[index], args[index+1])
    args = args.slice(0, index)
    return new CommandNode(tokens[0], args, [redirect])
  }

  return new CommandNode(tokens[0], args)
}
