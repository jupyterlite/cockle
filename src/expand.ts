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
  if (value[index + 1] === '?') {
    // '$?' is the exit code of the most recent command, held in the environment under '?'.
    // It is not a valid variable name so it needs handling here rather than via nameRegex.
    return [index + 2, environment.get('?') ?? '0'];
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

/** The result of expanding a value: the expanded text and, for each character of it, whether that
 * character came from an unquoted `$NAME` reference. Such a character is a candidate for word
 * splitting, whereas a literal or quoted character is not.
 */
export type Expansion = { text: string; expandable: boolean[] };

/**
 * Expand environment variable references in part of a command. Supports ` $NAME` and `${NAME}`.
 * A reference to an unset variable becomes an empty string.
 * A backslash outside single quotes removes itself and prevents the next character from being
 * special, so `\$HOME` becomes `$HOME`.
 * A '$' that does not start a reference is left untouched: followed by anything other than a name or '{', or within a single-quoted section.
 * @param value The string containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @param quoted An array of quoted sections in the string.
 * @param singleQuoted An array of single-quoted sections in the string.
 * @param heredoc Whether the value is the body of a here document. Its backslashes quote only '$',
 * '`', '\\' and newline, and its text is never split into fields.
 * @returns The expanded text and a mask of the characters which came from an unquoted reference.
 */
function _expand(
  value: string,
  environment: ReadonlyMap<string, string>,
  quoted?: [number, number][],
  singleQuoted?: [number, number][],
  heredoc: boolean = false
): Expansion {
  if (value.indexOf('$') < 0 && value.indexOf('\\') < 0) {
    return { text: value, expandable: new Array<boolean>(value.length).fill(false) };
  }

  const isInSection = (index: number, sections?: [number, number][]): boolean =>
    sections?.some(([start, end]) => index >= start && index < end) ?? false;

  let text: string = '';
  const expandable: boolean[] = [];
  let index: number = 0;
  while (index < value.length) {
    const char: string = value[index];
    const next: string | undefined = value[index + 1];
    const singleQuotedAtIndex: boolean = isInSection(index, singleQuoted);
    const doubleQuotedAtIndex: boolean = !singleQuotedAtIndex && isInSection(index, quoted);
    // A backslash outside single quotes removes itself and prevents the next character from being
    // special, so `\$HOME` becomes `$HOME`.
    // Within double quotes and here documents bash only removes it before a character that is special there, so `echo "a\qb"` keeps the backslash.
    const quotesNext: boolean = heredoc
      ? '$`\\\n'.includes(next ?? '')
      : !doubleQuotedAtIndex || '$`"\\\n'.includes(next ?? '');
    // Determine if the next character is quoted based on the context (heredoc, double quotes, etc.)
    if (char === '\\' && next !== undefined && !singleQuotedAtIndex && quotesNext) {
      text += next;
      expandable.push(false);
      index += 2;
      continue;
    }

    if (char !== '$' || singleQuotedAtIndex) {
      text += char;
      expandable.push(false);
      index++;
      continue;
    }

    const reference: [number, string] | undefined = _reference(value, index, environment, quoted);
    if (reference === undefined) {
      text += char;
      expandable.push(false);
      index++;
    } else {
      text += reference[1];
      // A reference inside double quotes or a here document is not a split point.
      const splittable: boolean = !doubleQuotedAtIndex && !heredoc;
      for (let i = 0; i < reference[1].length; i++) {
        expandable.push(splittable);
      }
      index = reference[0];
    }
  }
  return { text, expandable };
}

/**
 * Expand environment variable references in a here document body, which is expanded but not split
 * into fields. A quoted delimiter makes the body literal and so does not call this.
 * @param value The here document body.
 * @param environment The environment mapping variable names to their values.
 * @returns The body with environment variable references expanded.
 */
export function expandHeredoc(value: string, environment: ReadonlyMap<string, string>): string {
  return _expand(value, environment, undefined, undefined, true).text;
}

/**
 * Expand environment variable references in a string
 * @param value The string containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns The string with environment variable references expanded.
 */
export function expandString(value: string, environment: ReadonlyMap<string, string>): string {
  return _expand(value, environment).text;
}

/**
 * Expand environment variable references in a token, ignoring references within its
 * single-quoted sections.
 * @param token The token containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns The string with environment variable references expanded.
 */
export function expandToken(token: Token, environment: ReadonlyMap<string, string>): string {
  return _expand(token.value, environment, token.quoted, token.singleQuoted).text;
}

/**
 * Expand a token and split it into fields as the shell does for an unquoted expansion. An
 * unquoted reference to a value containing whitespace produces several fields, whereas the same
 * reference in quotes or a literal space in the source does not.
 * @param token The token containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns The fields of the expanded token, which is empty if the token expands to nothing.
 */
export function splitToken(token: Token, environment: ReadonlyMap<string, string>): string[] {
  if (token.value.indexOf('$') < 0 && token.value.indexOf('\\') < 0) {
    if (token.value === '') {
      return token.quoted?.length ? [''] : [];
    }
    return [token.value];
  }

  const { text, expandable } = _expand(token.value, environment, token.quoted, token.singleQuoted);
  if (text === '') {
    // bash: 'E=; $E' gives no fields, '"$E"' gives one empty field.
    return token.quoted?.length ? [''] : [];
  }

  const fields: string[] = [];
  let field: string = '';
  let index: number = 0;
  while (index < text.length) {
    if (' \t\n'.includes(text[index]) && expandable[index]) {
      // The start of a whitespace run produced by expansion is a field separator. A run which
      // includes any literal or quoted character is not, so 'x$A' with A=' y' is one field.
      let end: number = index;
      while (end < text.length && ' \t\n'.includes(text[end]) && expandable[end]) {
        end++;
      }
      fields.push(field);
      field = '';
      index = end;
    } else {
      field += text[index];
      index++;
    }
  }
  fields.push(field);

  // A field which is empty was produced only by expansion, so bash discards it: 'x$A' with A=' '
  // is one field. A quoted section keeps one empty field, so '"$E"' with E unset is one field.
  const nonEmpty: string[] = fields.filter(f => f !== '');
  return nonEmpty.length > 0 ? nonEmpty : token.quoted?.length ? [''] : [];
}

/**
 * Expand environment variable references in command arguments.
 * @param tokens The array of tokens containing the potential variable references.
 * @param environment The environment mapping variable names to their values.
 * @returns An array of strings with environment variable references expanded.
 */
export function expandTokens(tokens: Token[], environment: ReadonlyMap<string, string>): string[] {
  return tokens.flatMap(token => splitToken(token, environment));
}
