import type { Token } from './tokenize';

/**
 * Regular expression for a valid environment variable name.
 */
export const nameRegex: RegExp = /^[A-Za-z_][A-Za-z0-9_]*/;

/** The end offset and replacement text of the variable reference at index, if there is one.
 * @param value The string containing the potential variable reference.
 * @param index The index of the '$' character starting the reference.
 * @param environment The environment mapping variable names to their values.
 * @param quoted An array of quoted sections in the string.
 * @returns A tuple containing the end offset and replacement text of the variable reference, or undefined if there is no valid reference at the given index.
 */
function _reference(
  value: string,
  index: number,
  environment: ReadonlyMap<string, string>,
  quoted?: [number, number][]
): [number, string] | undefined {
  if (value[index + 1] === '{') {
    const end: number = value.indexOf('}', index + 2);
    if (end < 0) {
      // Unterminated '${'.
      return undefined;
    }
    const replacement_text: string = environment.get(value.slice(index + 2, end)) ?? '';
    return [end + 1, replacement_text];
  }
  const match: RegExpExecArray | null = nameRegex.exec(value.slice(index + 1));
  if (match === null) {
    return undefined;
  }
  let end: number = index + 1 + match[0].length;
  if (quoted !== undefined) {
    // The name of a reference does not span a quoted section boundary, so it ends at the first
    // character that is not in the same section as the first character of the name. Token values
    // have quote characters removed, so 'pre'X'post' has the value 'preXpost' and the name is
    // just the part outside the quotes.
    const section = (i: number): [number, number] | undefined =>
      quoted.find(([start, stop]) => i >= start && i < stop);
    const context = section(index + 1);
    let i: number = index + 1;
    while (i < end && section(i) === context) {
      i++;
    }
    end = i;
    if (end === index + 1) {
      // '$' immediately followed by quoted text, so there is no name.
      return undefined;
    }
  }
  return [end, environment.get(value.slice(index + 1, end)) ?? ''];
}

/**
 * Expand environment variable references in part of a command. Supports ` $NAME` and `${NAME}`.
 * A reference to an unset variable becomes an empty string.
 * A '$' that does not start a reference is left untouched: followed by anything other than a name or '{', preceded by a backslash, or within a single-quoted section.
 * @param value The string containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @param quoted An array of quoted sections in the string.
 * @param singleQuoted An array of single-quoted sections in the string.
 * @returns The string with environment variable references expanded.
 */
function _expand(
  value: string,
  environment: ReadonlyMap<string, string>,
  quoted?: [number, number][],
  singleQuoted?: [number, number][]
): string {
  const isSingleQuoted = (index: number): boolean =>
    singleQuoted?.some(([start, end]) => index >= start && index < end) ?? false;

  let ret: string = '';
  let index: number = 0;
  while (index < value.length) {
    const char: string = value[index];
    if (char !== '$' || value[index - 1] === '\\' || isSingleQuoted(index)) {
      ret += char;
      index++;
      continue;
    }
    const reference: [number, string] | undefined = _reference(value, index, environment, quoted);
    if (reference === undefined) {
      ret += char;
      index++;
    } else {
      ret += reference[1];
      index = reference[0];
    }
  }
  return ret;
}

/**
 * Expand environment variable references in a string
 * @param value The string containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns The string with environment variable references expanded.
 */
export function expandString(value: string, environment: ReadonlyMap<string, string>): string {
  return _expand(value, environment);
}

/**
 * Expand environment variable references in a token, ignoring references within its
 * single-quoted sections.
 * @param token The token containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns The string with environment variable references expanded.
 */
export function expandToken(token: Token, environment: ReadonlyMap<string, string>): string {
  return _expand(token.value, environment, token.quoted, token.singleQuoted);
}

/**
 * Expand environment variable references in command arguments.
 * @param tokens The array of tokens containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns An array of strings with environment variable references expanded.
 */
export function expandTokens(tokens: Token[], environment: ReadonlyMap<string, string>): string[] {
  return tokens.map(token => expandToken(token, environment));
}
