import type { Aliases } from './aliases';
import { GeneralError } from './error_exit_code';

const delimiters = ';&|><';
const whitespace = ' ';

export type Token = {
  // Stores offset into source string for error reporting.
  offset: number;
  value: string;
  // Body of a here document, set on '<<' and '<<-' tokens once the delimiter line has been read.
  heredoc?: string;
};

/** A here document whose delimiter word has been read but whose body has not yet. */
interface IPendingHeredoc {
  token: Token;
  delimiter: string;
  stripTabs: boolean;
}

export function tokenize(source: string, throwErrors: boolean = true, aliases?: Aliases): Token[] {
  const tokenizer = new Tokenizer(source, throwErrors, aliases);
  tokenizer.run();
  return tokenizer.tokens;
}

/**
 * Whether the source ends inside a quoted section, so that further input is required.
 */
export function hasOpenQuote(source: string): boolean {
  const tokenizer = new Tokenizer(source, false);
  tokenizer.run();
  return tokenizer.openQuote !== '';
}

/**
 * Whether a token value is a here document operator, '<<' or '<<-'.
 */
export function isHeredocToken(value: string): boolean {
  return value === '<<' || value === '<<-';
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

  /** End quote if the source ended within a quoted section, otherwise an empty string. */
  get openQuote(): string {
    return this._endQuote;
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

    // A token following a here document operator is its delimiter word.
    const previous : Token | undefined = this._tokens[this._tokens.length - 2];
    if (previous !== undefined && isHeredocToken(previous.value)) {
      this._pendingHeredocs.push({
        token: previous,
        delimiter: value,
        stripTabs: previous.value.endsWith('-')
      });
    }

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

    if (char === '\\' && this._endQuote !== "'" && this._source[i + 1] === '\n') {
      // Backslash-newline is a line continuation outside single quotes.
      this._index++; // Also skip the newline.
      return;
    }

    if (char === '\n' && this._endQuote === '') {
      this._newline();
      return;
    }

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
        if (this._value === '2' && char === '>') {
          // Special case stderr redirection to file.
          this._value += char;
        } else if (this._value === '<<' && char === '-') {
          // Special case here document with leading tab stripping.
          this._value += char;
          charType = CharType.Delimiter;
        } else if (this._addToken()) {
          // Finish current token and start new one.
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

  /** Handle a newline that is not within a quoted section. */
  private _newline(): void {
    if (this._offset >= 0 && !this._addToken()) {
      // Alias substitution modified the source, the newline will be handled again.
      return;
    }
    this._offset = -1;

    if (this._tokens.at(-1)?.value === '|') {
      // A newline after a pipe is ignored, as the command continues on the next line.
      return;
    }

    this._tokens.push({ offset: this._index, value: ';' });

    if (this._pendingHeredocs.length > 0) {
      this._readHeredocs();
    }
  }

  /** Read the bodies of pending here documents, which start after the command line. */
  private _readHeredocs(): void {
    while (this._pendingHeredocs.length > 0) {
      const { token, delimiter, stripTabs } = this._pendingHeredocs[0];
      const body : string | undefined = this._readHeredocBody(delimiter, stripTabs);
      if (body === undefined) {
        // The terminating delimiter line has not been read yet. Stop tokenizing as the
        // remainder of the source is here document content.
        this._index = this._source.length;
        return;
      }
      else
      {
        token.heredoc = body;
        this._pendingHeredocs.shift();
      }
    }
  }

  /**
   * Read a single here document body, starting on the line after the current position. Returns
   * undefined if the line containing only the delimiter is not present in the source.
   */
  private _readHeredocBody(delimiter: string, stripTabs: boolean): string | undefined {
    let body : string = '';
    let index : number = this._index + 1; // Skip the newline that ends the command line.

    while (index <= this._source.length) {
      const endOfLine : number = this._source.indexOf('\n', index);
      const lineEnd : number = endOfLine < 0 ? this._source.length : endOfLine;
      let line : string = this._source.slice(index, lineEnd);
      if (stripTabs) {
        line = line.replace(/^\t+/, '');
      }

      if (line === delimiter) {
        // Found the terminating delimiter line.
        this._index = lineEnd;
        return body;
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
  private _pendingHeredocs: IPendingHeredoc[] = [];
}
