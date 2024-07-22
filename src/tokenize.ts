import { Aliases } from './aliases';

const delimiters = ';&|><';
const whitespace = ' ';

export type Token = {
  // Stores offset into source string for error reporting.
  offset: number;
  value: string;
};

export function tokenize(source: string, aliases?: Aliases): Token[] {
  const tokenizer = new Tokenizer(source, aliases);
  tokenizer.run();
  return tokenizer.tokens;
}

enum CharType {
  None,
  Delimiter,
  Whitespace,
  Other
}

class State {
  prevChar: string = '';
  prevCharType: CharType = CharType.None;
  index: number = -1; // Index into source string.
  offset: number = -1; // Offset of start of current token, -1 if not in token.
  aliasOffset: number = -1;
}

class Tokenizer {
  constructor(
    source: string,
    readonly aliases?: Aliases
  ) {
    this._source = source;
    this._tokens = [];
    this._state = new State();
  }

  run() {
    while (this._state.index <= this._source.length) {
      this._next();
    }
  }

  get tokens(): Token[] {
    return this._tokens;
  }

  private _addToken(offset: number, value: string): boolean {
    if (this.aliases !== undefined && offset !== this._state.aliasOffset) {
      const isCommand =
        this._tokens.length === 0 || ';&|'.includes(this._tokens.at(-1)!.value.at(-1)!);

      if (isCommand) {
        const alias = this.aliases.getRecursive(value);
        if (alias !== undefined) {
          // Replace token with its alias and set state to beginning of it to re-tokenize.
          const n = value.length;
          this._state.offset = -1;
          this._state.index = offset - 1;
          this._state.aliasOffset = offset; // Do not attempt to alias this token again.
          this._source = this._source.slice(0, offset) + alias + this._source.slice(offset + n);
          this._state.prevChar = '';
          this._state.prevCharType = CharType.None;
          return false;
        }
      }
    }

    this._tokens.push({ offset, value });
    return true;
  }

  private _getCharType(char: string): CharType {
    if (whitespace.includes(char)) {
      return CharType.Whitespace;
    } else if (delimiters.includes(char)) {
      return CharType.Delimiter;
    } else {
      return CharType.Other;
    }
  }

  private _next() {
    const i = ++this._state.index;

    const char = i < this._source.length ? this._source[i] : ' ';
    const charType = this._getCharType(char);
    if (this._state.offset >= 0) {
      // In token.
      if (charType === CharType.Whitespace) {
        // Finish current token.
        if (this._addToken(this._state.offset, this._source.slice(this._state.offset, i))) {
          this._state.offset = -1;
        }
      } else if (
        charType !== this._state.prevCharType ||
        (charType === CharType.Delimiter && char !== this._state.prevChar)
      ) {
        // Finish current token and start new one.
        if (this._addToken(this._state.offset, this._source.slice(this._state.offset, i))) {
          this._state.offset = i;
        }
      }
    } else {
      // Not in token.
      if (charType !== CharType.Whitespace) {
        // Start new token.
        this._state.offset = i;
      }
    }
    this._state.prevChar = char;
    this._state.prevCharType = charType;
  }

  private _source: string;
  private _tokens: Token[];
  private _state: State;
}
