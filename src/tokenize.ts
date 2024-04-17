const delimiters = ";&"
const whitespace = " "

export function tokenize(source: string): number[] {
  // Length of returned array is twice number of tokens.
  // Array elements are offsets (start, beyond end) or each token in source.
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
  return offsets
}

// Validate function?
