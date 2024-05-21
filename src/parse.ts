import { Token, tokenize } from "./tokenize"

const endOfCommand = ";&"
//const ignore_trailing = ";"

export class ParseError extends Error {}

export class AST {
  // This is called an AST but is just an array of commands initially.
  // Eventually will change a lot to support more complexity.
  constructor(readonly tokens: Token[], readonly commandOffsets: number[]) {
    this._validate()
  }

  command(i: number): string[] {
    if (i < 0 || i >= this.commandCount) {
      throw new RangeError(`index must be in range 0 to ${this.commandCount} inclusive`)
    }
    const startIndex = this.commandOffsets[2*i]
    const endIndex = this.commandOffsets[2*i+1]
    const range = [...Array(endIndex - startIndex).keys()]
    return range.map((i) => this.tokens[i + startIndex].value)
  }

  get commandCount(): number {
    return this.commandOffsets.length / 2
  }

  get commands(): string[][] {
    const ret: string[][] = []
    for (let i = 0; i < this.commandCount; i++) {
      ret.push(this.command(i))
    }
    return ret
  }

  private _validate(): void {
    // Almost identical to TokenizedSource._validate
    const n = this.commandOffsets.length
    if (n == 0) {
      return
    }

    if (n % 2 == 1) {
      throw new ParseError("Offsets has odd length")
    }
    for (let i = 0; i < n; i += 2) {
      const start = this.commandOffsets[i]
      const end = this.commandOffsets[i+1]
      if (end <= start) {
        throw new ParseError(`Token ${i/2} has invalid offsets [${start}, ${end}]]`)
      }
      if (i > 0 && this.commandOffsets[i-1] > start) {
        throw new ParseError(`Token ${i/2} overlaps previous token`)
      }
    }
    if (this.commandOffsets[0] < 0 || this.commandOffsets[n-1] > this.tokens.length) {
      throw new ParseError("Offsets are outside source string")
    }
  }
}

export function parse(source: string): AST {
  const tokens = tokenize(source)

  const commandOffsets: number[] = []
  const ntokens = tokens.length
  let inCommand: boolean = false

  for (let i = 0; i < ntokens; i++) {
    const token = tokens[i]
    if (inCommand) {
      if (endOfCommand.includes(token.value)) {
        // Finish current command, ignore endOfCommand token.
        commandOffsets.push(i)
        inCommand = false
      }
    } else {  // !inCommand
      if (!endOfCommand.includes(token.value)) {
        // Start new token.
        commandOffsets.push(i)
        inCommand = true
      }
    }
  }
  if (inCommand) {
    // Finish last token.
    commandOffsets.push(ntokens)
  }
  return new AST(tokens, commandOffsets)
}
