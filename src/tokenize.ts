const delimiters = ";&"
const whitespace = " "

export class TokenizeError extends Error {}

export class TokenizedSource {
  // Length of offsets array is twice number of tokens.
  // Offsets are (start, end) indices for each token in source.
  constructor(readonly source: string, readonly offsets: number[]) {
    this._validate()
  }

  get length(): number {
    return this.offsets.length / 2
  }

  token(i: number): string {
    if (i < 0 || i >= this.length) {
      throw new RangeError(`index must be in range 0 to ${this.length} inclusive`)
    }
    return this.source.slice(this.offsets[2*i], this.offsets[2*i+1])
  }

  get tokens(): string[] {
    const n = this.length
    const range = [...Array(n).keys()]
    return range.map((i) => this.token(i))
  }

  private _validate(): void {
    const n = this.offsets.length
    if (n == 0) {
      return
    }

    if (n % 2 == 1) {
      throw new TokenizeError("Offsets has odd length")
    }
    for (let i = 0; i < n; i += 2) {
      const start = this.offsets[i]
      const end = this.offsets[i+1]
      if (end <= start) {
        throw new TokenizeError(`Token ${i/2} has invalid offsets [${start}, ${end}]]`)
      }
      if (i > 0 && this.offsets[i-1] > start) {
        throw new TokenizeError(`Token ${i/2} overlaps previous token`)
      }
    }
    if (this.offsets[0] < 0 || this.offsets[n-1] > this.source.length) {
      throw new TokenizeError("Offsets are outside source string")
    }
  }
}

export function tokenize(source: string): TokenizedSource {
  const offsets = []
  const n = source.length
  let in_token: boolean = false

  for (let i = 0; i < n; i++) {
    const char = source[i]
    if (in_token) {
      if (whitespace.includes(char)) {
        // Finish current token.
        offsets.push(i)
        in_token = false
      } else if (delimiters.includes(char)) {
        // Finish current token and start next one.
        offsets.push(i, i)
      }
    } else {  // !in_token
      if (!whitespace.includes(char)) {
        // Start new token.
        offsets.push(i)
        in_token = true
      }
    }
  }
  if (in_token) {
    // Finish last token.
    offsets.push(n)
  }
  return new TokenizedSource(source, offsets)
}
