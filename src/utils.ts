export async function delay(milliseconds: number = 10): Promise<void> {
  await new Promise(f => setTimeout(f, milliseconds));
}

export function isLetter(char: number): boolean {
  return (char >= 65 && char <= 90) || (char >= 97 && char <= 122);
}

/**
 * Join a baseUrl to a path, ensuring there is exactly one slash at the join position.
 */
export function joinURL(baseUrl: string, path: string): string {
  baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes.
  path = path.replace(/^\/+/, ''); // Remove leading slashes.
  return `${baseUrl}/${path}`;
}

/**
 * Find the longest string that starts all of the supplied strings.
 * startIndex is the index to start at, if you already know that the first startIndex characters
 * are identical.
 */
export function longestStartsWith(strings: string[], startIndex: number = 0): string {
  if (strings.length < 1) {
    return '';
  }
  const minLength = Math.min(...strings.map(str => str.length));
  const toMatch = strings[0];
  let index = startIndex;
  while (index < minLength && strings.every(str => str[index] === toMatch[index])) {
    index++;
  }
  return toMatch.slice(0, index);
}

/**
 * Trim whitespace from end of string.
 */
export function rtrim(text: string): string {
  return text.replace(/\s+$/, '');
}

/**
 * Convert array of char codes to string without exceeding maximum call stack size.
 */
export function stringFromCharCodes(codes: number[] | Int8Array): string {
  // Using the spread operator with a very long array (e.g. 100000) can lead to a RangeError as
  // maximum call size is exceeded. So here chunking into smaller arrays.
  const chunkSize = 10000;
  const strings: string[] = [];
  const n = codes.length;
  for (let i = 0; i < n; i += chunkSize) {
    strings.push(String.fromCharCode(...codes.slice(i, i + chunkSize)));
  }
  return strings.join('');
}

/**
 * Arrange an array of strings into columns that fit within a columnWidth.
 * Each column is the same width.
 * Return an array of lines.
 */
export function toColumns(strings: string[], columnWidth: number): string[] {
  if (strings.length < 1) {
    return [];
  }

  if (columnWidth < 1) {
    // If don't know number of columns, use a single line which will be too long.
    return [strings.join('  ')];
  }

  const nstrings = strings.length;
  const gap = 2;
  const maxLength = Math.max(...strings.map(str => str.length));
  const ncols = Math.min(Math.floor(columnWidth / (maxLength + gap)), nstrings);
  const nrows = Math.ceil(nstrings / ncols);

  const lines = [];
  for (let row = 0; row < nrows; ++row) {
    let line = '';
    for (let col = 0; col < ncols; ++col) {
      const index = col * nrows + row;
      if (index >= nstrings) {
        continue;
      }
      const str = strings[index];
      line += str;
      if (index + nrows < nstrings) {
        line += ' '.repeat(maxLength + gap - str.length);
      }
    }
    lines.push(line);
  }
  return lines;
}
