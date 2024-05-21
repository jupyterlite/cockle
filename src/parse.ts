import { Token, tokenize } from "./tokenize"

const endOfCommand = ";&"
//const ignore_trailing = ";"


export abstract class Node {}

export class CommandNode extends Node {
  constructor(readonly name: Token, readonly suffix: Token[]) {
    super()
  }
}


export function parse(source: string): Node[] {
  const tokens = tokenize(source)

  const ret: Node[] = []
  let offset: number = -1  // Offset of start of current command, -1 if not in command.
  const n = tokens.length

  for (let i = 0; i < n; i++) {
    const token = tokens[i]
    if (offset >= 0) {  // In command
      if (endOfCommand.includes(token.value)) {
        // Finish current command, ignore endOfCommand token.
        ret.push(new CommandNode(tokens[offset], tokens.slice(offset+1, i)))
        offset = -1
      }
    } else {  // Not in command
      if (!endOfCommand.includes(token.value)) {
        // Start new token.
        offset = i
      }
    }
  }

  if (offset >= 0) {
    // Finish last command.
    ret.push(new CommandNode(tokens[offset], tokens.slice(offset+1, n)))
  }

  return ret
}
