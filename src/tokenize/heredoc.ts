/**
 * Whether a token value is a here document operator, '<<' or '<<-'.
 */
export function isHeredocToken(value: string): boolean {
  return value === '<<' || value === '<<-';
}

/**
 * Read a single here document body, starting on the line after the command line whose newline is
 * at commandEnd. Returns the body and the index of the end of the delimiter line, or undefined if
 * the line containing only the delimiter is not present in the source.
 */
export function readHeredocBody(
  source: string,
  commandEnd: number,
  delimiter: string,
  stripTabs: boolean
): { body: string; end: number } | undefined {
  let body: string = '';
  let index: number = commandEnd + 1; // Skip the newline that ends the command line.

  while (index <= source.length) {
    const endOfLine: number = source.indexOf('\n', index);
    const lineEnd: number = endOfLine < 0 ? source.length : endOfLine;
    let line: string = source.slice(index, lineEnd);
    if (stripTabs) {
      line = line.replace(/^\t+/, '');
    }

    if (line === delimiter) {
      // Found the terminating delimiter line.
      return { body, end: lineEnd };
    }

    if (endOfLine < 0) {
      // No terminating delimiter before the end of the source.
      return undefined;
    }

    body += `${line}\n`;
    index = endOfLine + 1;
  }

  return undefined;
}
