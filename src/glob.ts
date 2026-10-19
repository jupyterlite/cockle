/**
 * Filename wildcard expansion, also known as pathname expansion or globbing.
 */

/** The subset of the Emscripten file system API needed for filename expansion. */
export interface IGlobFileSystem {
  readdir(path: string): string[];
  cwd(): string;
  stat(path: string): { mode: number };
  isDir(mode: number): boolean;
}

/**
 * Whether a word contains a wildcard metacharacter outside a quoted or escaped section. A word
 * with no wildcard is never expanded, as in bash.
 *
 * @param text The word, with quotes already removed.
 * @param quoted For each character of the word, whether it was quoted or escaped in the source
 * and so is literal rather than a wildcard metacharacter.
 * @returns True if the word contains an active wildcard metacharacter.
 */
export function hasWildcard(text: string, quoted: readonly boolean[]): boolean {
  return text.split('').some((char, index) => !quoted[index] && '*?['.includes(char));
}

/** Escape a character that is special in the source of a regular expression. */
function _escapeRegex(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Characters which are special as a literal member or range endpoint of a regular expression class. */
const CLASS_SPECIAL_CHARS: string = '\\]^-';

/** Escape a character that is special as a literal member of a regular expression class. */
function _escapeClassChar(char: string): string {
  return CLASS_SPECIAL_CHARS.includes(char) ? `\\${char}` : char;
}

/** A member of a bracket expression: a single character or an inclusive range. */
type BracketMember = string | [string, string];

/**
 * Parse the bracket expression starting at `text[start]`, which is a '['. Returns the source of a
 * regular expression character class and the index of its closing ']', or undefined if there is
 * no closing ']' so that the '[' is a literal character.
 */
function _bracketExpression(
  text: string,
  quoted: readonly boolean[],
  start: number
): [string, number] | undefined {
  let index: number = start + 1;
  let negated: boolean = false;
  if (index < text.length && !quoted[index] && (text[index] === '!' || text[index] === '^')) {
    negated = true;
    index++;
  }

  const members: BracketMember[] = [];
  while (index < text.length) {
    const char: string = text[index];
    if (char === ']' && members.length > 0 && !quoted[index]) {
      break;
    }
    const previous: BracketMember | undefined = members.at(-1);
    const endpoint: string | undefined = text[index + 1];
    // An unquoted ']' closes the expression instead of ending a range.
    if (
      char === '-' &&
      !quoted[index] &&
      typeof previous === 'string' &&
      endpoint !== undefined &&
      (quoted[index + 1] || endpoint !== ']')
    ) {
      members[members.length - 1] = [previous, endpoint];
      index += 2;
    } else {
      members.push(char);
      index++;
    }
  }
  if (index >= text.length) {
    return undefined;
  }

  // A range whose start is after its end matches nothing and is omitted, as in bash.
  const source: string = members
    .map(member => {
      if (typeof member === 'string') {
        return _escapeClassChar(member);
      }
      return member[0] <= member[1]
        ? `${_escapeClassChar(member[0])}-${_escapeClassChar(member[1])}`
        : '';
    })
    .join('');
  return [negated ? `[^${source}]` : `[${source}]`, index];
}

/**
 * A regular expression matching a single path component. '*' and '?' do not match '/', and
 * metacharacters within a quoted or escaped section are literal.
 */
function _componentRegex(text: string, quoted: readonly boolean[]): RegExp {
  let pattern: string = '';
  for (let index = 0; index < text.length; index++) {
    const char: string = text[index];
    if (quoted[index]) {
      pattern += _escapeRegex(char);
    } else if (char === '*') {
      pattern += '[^/]*';
    } else if (char === '?') {
      pattern += '[^/]';
    } else if (char === '[') {
      const bracket: [string, number] | undefined = _bracketExpression(text, quoted, index);
      if (bracket === undefined) {
        pattern += '\\[';
      } else {
        pattern += bracket[0];
        index = bracket[1];
      }
    } else {
      pattern += _escapeRegex(char);
    }
  }
  return new RegExp(`^${pattern}$`);
}

/** A path component: a literal name, or a predicate matching names in a directory. */
type Component = string | ((name: string) => boolean);

/** Build a component of the pattern from its text and quoting mask. */
function _makeComponent(text: string, quoted: readonly boolean[]): Component {
  if (!hasWildcard(text, quoted)) {
    return text;
  }
  const regex: RegExp = _componentRegex(text, quoted);
  const dotLed: boolean = text.startsWith('.');
  // Wildcards do not match a leading '.', or the names '.' and '..'.
  return (name: string): boolean =>
    name !== '.' && name !== '..' && (dotLed || !name.startsWith('.')) && regex.test(name);
}

/** Join a directory and a name into a single path. */
function _join(dir: string, name: string): string {
  return dir.endsWith('/') ? dir + name : `${dir}/${name}`;
}

/** Determine the kind of a path in the file system, or undefined if it does not exist. */
function _kind(fs: IGlobFileSystem, path: string): 'dir' | 'file' | undefined {
  try {
    return fs.isDir(fs.stat(path).mode) ? 'dir' : 'file';
  } catch {
    return undefined;
  }
}

/** Names in `dir` which match a component of the pattern. */
function _namesIn(fs: IGlobFileSystem, dir: string, component: Component): string[] {
  return typeof component === 'string'
    ? [component]
    : fs.readdir(dir).filter(name => component(name));
}

/** One step of filename expansion: the directory, the component, and the names accumulated. */
interface IWalkState {
  readonly dir: string;
  readonly index: number;
  readonly names: readonly string[];
}

/**
 * Expand a filename wildcard pattern against a file system, as bash does.
 *
 * '*' and '?' match within a single path component and never '/'. Bracket expressions such as
 * '[ab]', '[a-z]' and '[!ab]' are supported. Quoted or escaped metacharacters are literal.
 * Wildcards do not match a leading '.' or the names '.' and '..'.
 *
 * The result keeps the form of the pattern: absolute patterns give absolute paths, relative
 * patterns give relative paths, and a trailing '/' keeps only directories.
 *
 * @param text The pattern, with quotes already removed.
 * @param quoted For each character of the pattern, whether it was quoted or escaped in the source
 * and so is literal rather than a wildcard metacharacter.
 * @param fs The file system to expand against.
 * @returns The matching paths in sorted order, empty if there are no matches.
 */
export function glob(text: string, quoted: readonly boolean[], fs: IGlobFileSystem): string[] {
  const absolute: boolean = text.startsWith('/');
  const directoryOnly: boolean = text.endsWith('/');

  const inside: string = text.slice(absolute ? 1 : 0).replace(/\/+$/, '');
  const parts: string[] = inside === '' ? [] : inside.split('/');

  // Skip the empty components (repeated '/') that follow a wildcard component.
  const components: Component[] = [];
  let offset: number = absolute ? 1 : 0;
  let wildcardSeen: boolean = false;
  for (const part of parts) {
    const component: Component = _makeComponent(part, quoted.slice(offset, offset + part.length));
    if (part !== '' || !wildcardSeen) {
      components.push(component);
    }
    wildcardSeen ||= typeof component !== 'string';
    offset += part.length + 1;
  }
  if (components.length === 0) {
    return absolute ? ['/'] : [];
  }

  // Expand one component at a time, keeping the directory and names reached so far.
  const queue: IWalkState[] = [{ dir: absolute ? '/' : fs.cwd(), index: 0, names: [] }];
  const results: string[] = [];
  for (let position = 0; position < queue.length; position++) {
    const { dir, index, names } = queue[position];
    const last: boolean = index === components.length - 1;
    for (const name of _namesIn(fs, dir, components[index])) {
      const child: string = name === '' ? dir : _join(dir, name);
      if (!last) {
        if (name === '' || _kind(fs, child) === 'dir') {
          queue.push({ dir: child, index: index + 1, names: [...names, name] });
        }
      } else {
        const type: 'dir' | 'file' | undefined = _kind(fs, child);
        if (directoryOnly ? type === 'dir' : type !== undefined) {
          results.push(
            (absolute ? '/' : '') + [...names, name].join('/') + (directoryOnly ? '/' : '')
          );
        }
      }
    }
  }
  return results.sort();
}
