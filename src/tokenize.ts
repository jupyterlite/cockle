const delimiters = ";&|>"
const whitespace = " "

export type Token = {
  // Stores offset into source string for error reporting.
  offset: number
  value: string
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []

  let offset: number = -1  // Offset of start of current token, -1 if not in token.
  const n = source.length

  for (let i = 0; i < n; i++) {
    const char = source[i]
    if (offset >= 0) {  // In token.
      if (whitespace.includes(char)) {
        // Finish current token.
        tokens.push({offset, value: source.slice(offset, i)})
        offset = -1
      } else if (delimiters.includes(char)) {
        // Finish current token and create new one for delimiter.
        tokens.push({offset, value: source.slice(offset, i)})
        tokens.push({offset: i, value: source.slice(i, i+1)})
        offset = -1
      }
    } else {  // Not in token.
      if (delimiters.includes(char)) {
        // Single character delimiter.
        tokens.push({offset: i, value: source.slice(i, i+1)})
      } else if (!whitespace.includes(char)) {
        // Start new token.
        offset = i
      }
    }
  }

  if (offset >= 0) {
    // Finish last token.
    tokens.push({offset, value: source.slice(offset, n)})
  }

  return tokens
}
