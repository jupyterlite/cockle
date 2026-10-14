import type { Token } from '../tokenize';

/** `NAME=value` assignment token: a leading name which is followed directly by an unquoted '='.
 *
 * As in bash, the name is never expanded or unquoted, so a '$', a quote character or any character
 * outside the name regex makes the token a command word instead. The value is everything after the
 * first '=' that is outside a single-quoted section, so `A='b=c'` and `A=b'='c` both assign the
 * value `b=c`, whereas `A=B=1` assigns `B=1` to `A`.
 * @param token The token to parse for a `NAME=value` assignment.
 * @returns A tuple containing the name and value if the token is a valid `NAME=value` assignment, or undefined otherwise.
 */
export function parseAssignment(token: Token): [string, string] | undefined {
  const match: RegExpExecArray | null = /^[A-Za-z_][A-Za-z0-9_]*=/.exec(token.value);
  if (match === null) {
    return undefined;
  }
  const index: number = match[0].length - 1;
  if (token.quoted?.some(([start]) => start <= index)) {
    // The name is not expanded or unquoted, so a quote at or before the '=' makes the token a
    // command word, as bash does: "'X'=1", "A''=1" and "A'x'=1" all report command not found.
    return undefined;
  }
  return [match[0].slice(0, -1), token.value.slice(index + 1)];
}
