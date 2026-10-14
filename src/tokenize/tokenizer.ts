import { isHeredocToken, readHeredocBody } from './heredoc';
import { extendsRedirect, isRedirectToken } from './redirect';
import type { Aliases } from '../aliases';
import { GeneralError } from '../error_exit_code';

const delimiters = ';&|><';
const whitespace = ' ';

export type Token = {
  // Stores offset into source string for error reporting.
  offset: number;
  value: string;
  // Body of a here document, set on '<<' and '<<-' tokens once the delimiter line has been read.
  heredoc?: string;
  // Set on '<<' and '<<-' tokens whose delimiter word contained a quoted section. As in bash, that
  // makes the here document body literal, without it the body is expanded but not split.
  quotedDelimiter?: boolean;
  // Value offsets [start, end) of characters that came from a quoted section of the source,
  // single or double quoted. A '$' reference does not span a section boundary. Set for tokens
  // which contain quoted sections.
  quoted?: [number, number][];
  // Subset of 'quoted' for single-quoted sections: '$' references within them are not expanded.
  singleQuoted?: [number, number][];
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
          this._quoted = [];
          this._singleQuoted = [];
          return false;
        }
      }
    }

    const token: Token = { offset, value };
    if (this._quoted.length > 0) {
      token.quoted = this._quoted;
    }
    if (this._singleQuoted.length > 0) {
      token.singleQuoted = this._singleQuoted;
    }
    this._quoted = [];
    this._singleQuoted = [];
    this._tokens.push(token);

    // A token following a here document operator is its delimiter word.
    const previous: Token | undefined = this._tokens.at(-2);
    if (previous !== undefined && isHeredocToken(previous.value)) {
      if (token.quoted !== undefined) {
        previous.quotedDelimiter = true;
      }
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
          if (this._endQuote === "'") {
            this._singleQuoted.push([this._quoteStart, this._value.length]);
          }
          this._quoted.push([this._quoteStart, this._value.length]);
          this._endQuote = '';
          charType = CharType.Other;
        }
      } else if (endQuote) {
        if (isRedirectToken(this._value)) {
          // A redirection operator ends before a quoted word: '<<"EOF"' is the operator '<<'
          // followed by the quoted delimiter 'EOF'.
          if (!this._addToken()) {
            // Alias substitution modified the source, the quote will be handled again.
            return;
          }
          this._offset = i;
          this._endQuote = endQuote;
          this._value = '';
          this._quoteStart = 0; // The value is empty at the start of a token.
          charType = CharType.Other;
        } else {
          // Start quoted section within current token.
          this._endQuote = endQuote;
          this._quoteStart = this._value.length;
        }
      } else if (charType === CharType.Whitespace) {
        // Finish current token.
        if (this._addToken()) {
          this._offset = -1;
        }
      } else if (
        charType !== this._prevCharType ||
        (charType === CharType.Delimiter && char !== this._prevChar)
      ) {
        if (extendsRedirect(this._value, char)) {
          // Continue a redirection operator, e.g. the '>' after '2' or the '&' after '>'.
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
        if (this._endQuote !== '') {
          this._quoteStart = 0; // The value is empty at the start of a token.
        }
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
      const heredoc = readHeredocBody(this._source, this._index, delimiter, stripTabs);
      if (heredoc === undefined) {
        // The terminating delimiter line has not been read yet. Stop tokenizing as the
        // remainder of the source is here document content.
        this._index = this._source.length;
        return;
      } else {
        token.heredoc = heredoc.body;
        this._index = heredoc.end;
        this._pendingHeredocs.shift();
      }
    }
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
  private _quoted: [number, number][] = []; // Quoted sections of current token.
  private _singleQuoted: [number, number][] = []; // Single-quoted sections of current token.
  private _quoteStart: number = 0; // Value offset of start of current quoted section.
  private _endQuote: string = ''; // End quote if in quoted section, otherwise emptry string.
  private _pendingHeredocs: IPendingHeredoc[] = [];
}
