import { Aliases } from './aliases';
import { GeneralError } from './error_exit_code';

const delimiters = ';&|><';
const whitespace = ' ';

export type Token = {
  // Stores offset into source string for error reporting.
  offset: number;
  value: string;
};

export function tokenize(source: string, throwErrors: boolean = true, aliases?: Aliases): Token[] {
  const tokenizer = new Tokenizer(source, throwErrors, aliases);
  tokenizer.run();
  return tokenizer.tokens;
}

enum CharType {
  None,
  Delimiter,
  DoubleQuote,
  SingleQuote,
  Whitespace,
  Other
}

class Tokenizer {
  constructor(
    source: string,
    readonly throwErrors: boolean,
    readonly aliases?: Aliases
  ) {
    this._source = source;
    this._tokens = [];
  }

  run() {
    while (this._index <= this._source.length) {
      this._next();
    }

    if (this.throwErrors) {
      if (this._endQuote !== '') {
        throw new GeneralError('Tokenize error, expected end quote ' + this._endQuote);
      }
    }
  }

  get tokens(): Token[] {
    return this._tokens;
  }

  private _addToken(): boolean {
    const offset = this._offset;
    const value = this._value;

    if (this.aliases !== undefined && offset !== this._aliasOffset) {
      const isCommand =
        this._tokens.length === 0 || ';&|'.includes(this._tokens.at(-1)!.value.at(-1)!);

      if (isCommand) {
        const alias = this.aliases.getRecursive(value);
        if (alias !== undefined) {
          // Replace token with its alias and set state to beginning of it to re-tokenize.
          const n = value.length;
          this._offset = -1;
          this._index = offset - 1;
          this._aliasOffset = offset; // Do not attempt to alias this token again.
          this._source = this._source.slice(0, offset) + alias + this._source.slice(offset + n);
          this._prevChar = '';
          this._prevCharType = CharType.None;
          this._value = '';
          this._endQuote = '';
          return false;
        }
      }
    }

    this._tokens.push({ offset, value });
    this._endQuote = '';
    return true;
  }

  private _getCharType(char: string): CharType {
    if (whitespace.includes(char)) {
      return CharType.Whitespace;
    } else if (delimiters.includes(char)) {
      return CharType.Delimiter;
    } else if (char === "'") {
      return CharType.SingleQuote;
    } else if (char === '"') {
      return CharType.DoubleQuote;
    } else {
      return CharType.Other;
    }
  }

  private _endQuoteFromCharType(charType: CharType): string {
    if (charType === CharType.DoubleQuote) {
      return '"';
    } else if (charType === CharType.SingleQuote) {
      return "'";
    } else {
      return '';
    }
  }

  private _next() {
    const i = ++this._index;
    const char = i < this._source.length ? this._source[i] : ' ';
    let charType = this._getCharType(char);
    const endQuote = this._endQuoteFromCharType(charType);

    if (this._offset >= 0) {
      // In token.
      if (this._endQuote) {
        // In quoted section, continue until reach end quote.
        if (char !== this._endQuote) {
          this._value += char;
        } else {
          this._endQuote = '';
          charType = CharType.Other;
        }
      } else if (endQuote) {
        // Start quoted section within current token.
        this._endQuote = endQuote;
      } else if (charType === CharType.Whitespace) {
        // Finish current token.
        if (this._addToken()) {
          this._offset = -1;
        }
      } else if (
        charType !== this._prevCharType ||
        (charType === CharType.Delimiter && char !== this._prevChar)
      ) {
        // Finish current token and start new one.
        if (this._addToken()) {
          this._offset = i;
          this._value = char;
        }
      } else {
        // Continue in current token.
        this._value += char;
      }
    } else {
      // Not in token.
      if (charType !== CharType.Whitespace) {
        // Start new token.
        this._offset = i;
        this._endQuote = this._endQuoteFromCharType(charType);
        this._value = this._endQuote === '' ? char : '';
      }
    }
    this._prevChar = char;
    this._prevCharType = charType;
  }

  private _source: string;
  private _tokens: Token[];

  // Tokenizer state.
  private _prevChar: string = '';
  private _prevCharType: CharType = CharType.None;
  private _index: number = -1; // Index into source string.
  private _offset: number = -1; // Offset of start of current token, -1 if not in token.
  private _aliasOffset: number = -1;
  private _value: string = ''; // Current token.
  private _endQuote: string = ''; // End quote if in quoted section, otherwise emptry string.
}
