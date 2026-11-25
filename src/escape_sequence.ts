// Matches a complete escape sequence at a particular index: CSI, OSC (terminated by BEL or ST),
// SS3, or other ESC sequence. Matches a lone ESC if it is not the start of a valid sequence.
const escapeRegex =
  // eslint-disable-next-line no-control-regex
  /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|O[@-~]|[ -/]*[0-~])?/y;

// Matches from a particular index to the end of the text if that is the start of an escape sequence
// that needs more characters to complete it.
const incompleteEscapeRegex =
  // eslint-disable-next-line no-control-regex
  /\x1b(?:\[[0-?]*[ -/]*|\][^\x07\x1b]*\x1b?|O|[ -/]*)$/y;

// eslint-disable-next-line no-control-regex
const sgrRegex = /^\x1b\[[0-9;:]*m$/;

const hyperlinkPrefix = '\x1b]8;';
export const hyperlinkClose = '\x1b]8;;\x1b\\';

/**
 * Return the escape sequence that starts at `index` of `text`, which must be an ESC character.
 */
export function escapeSequenceAt(text: string, index: number): string {
  escapeRegex.lastIndex = index;
  escapeRegex.exec(text);
  return text.slice(index, escapeRegex.lastIndex);
}

/**
 * Return the URI of an OSC 8 hyperlink sequence, which is empty if it closes a hyperlink.
 */
export function hyperlinkUri(seq: string): string {
  const terminatorLength = seq.endsWith('\x07') ? 1 : 2;
  const body = seq.slice(2, seq.length - terminatorLength);
  // body is 8;params;URI and URI may contain semicolons.
  return body.split(';').slice(2).join(';');
}

export function isControl(codePoint: number): boolean {
  return codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0);
}

function isHyperlink(seq: string): boolean {
  return seq.startsWith(hyperlinkPrefix);
}

/**
 * Return true if `text` from `index`, which must be an ESC character, to its end is the start of
 * an escape sequence that needs more characters to complete it.
 */
export function isIncompleteEscapeSequenceAt(text: string, index: number): boolean {
  incompleteEscapeRegex.lastIndex = index;
  return incompleteEscapeRegex.test(text);
}

export function isSgr(seq: string): boolean {
  return sgrRegex.test(seq);
}

export function isSupported(seq: string): boolean {
  return isSgr(seq) || isHyperlink(seq);
}

/**
 * Remove all escape sequences except SGR styles and OSC 8 hyperlinks, as others such as cursor
 * movement would corrupt the paged display. Also remove all control characters except \n and \t.
 */
export function removeUnsupported(text: string): string {
  let ret = '';
  for (let i = 0; i < text.length; ) {
    if (text[i] === '\x1b') {
      const seq = escapeSequenceAt(text, i);
      i += seq.length;
      if (isSupported(seq)) {
        ret += seq;
      }
    } else {
      const char = text[i++];
      if (char === '\n' || char === '\t' || !isControl(char.charCodeAt(0))) {
        ret += char;
      }
    }
  }
  return ret;
}

/**
 * Update the list of active SGR style sequences with a new SGR sequence. If the new sequence
 * contains a reset then all previous styles are dropped, and if there are no styles after the
 * reset then the new sequence is also dropped.
 */
export function updateStyles(styles: string[], seq: string): string[] {
  const params = seq.slice(2, -1).split(';');
  let reset = false;
  let styleAfterReset = false;
  for (let i = 0; i < params.length; i++) {
    // A parameter may have colon separated sub-parameters such as 38:2::255:0:0 or 4:3, which are
    // all part of that parameter, so only the first is checked.
    const [first, ...subParams] = params[i].split(':');
    const param = first === '' ? 0 : Number(first);
    if (param === 0) {
      reset = true;
      styleAfterReset = false;
    } else {
      styleAfterReset = true;
      if ((param === 38 || param === 48 || param === 58) && subParams.length === 0) {
        // Semicolon separated extended color, skip its arguments which may include zeros.
        if (params[i + 1] === '5') {
          i += 2;
        } else if (params[i + 1] === '2') {
          i += 4;
        }
      }
    }
  }
  if (reset) {
    return styleAfterReset ? [seq] : [];
  }
  return [...styles, seq];
}
