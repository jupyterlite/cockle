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

  let prevChar: string = ""
  let prevCharType: CharType = CharType.None
  for (let i = 0; i < n; i++) {
    const char = source[i]
    const charType = _getCharType(char)
    if (offset >= 0) {  // In token.
      if (charType == CharType.Whitespace) {
        // Finish current token.
        tokens.push({offset, value: source.slice(offset, i)})
        offset = -1
      } else if (charType != prevCharType || (charType == CharType.Delimiter && char != prevChar)) {
        // Finish current token and start new one.
        tokens.push({offset, value: source.slice(offset, i)})
        offset = i
      }
    } else {  // Not in token.
      if (charType != CharType.Whitespace) {
        // Start new token.
        offset = i
      }
    }
    prevChar = char
    prevCharType = charType
  }

  if (offset >= 0) {
    // Finish last token.
    tokens.push({offset, value: source.slice(offset, n)})
  }

  return tokens
}

enum CharType {
  None,
  Delimiter,
  Whitespace,
  Other,
}

function _getCharType(char: string): CharType {
  if (whitespace.includes(char)) {
    return CharType.Whitespace
  } else if (delimiters.includes(char)) {
    return CharType.Delimiter
  } else {
    return CharType.Other
  }
}
