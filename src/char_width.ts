import { isHighSurrogate, isLowSurrogate } from './utils';

// Combining marks and format characters such as zero width joiner, which take up no columns.
const zeroWidthRegex = /^[\p{Mn}\p{Me}\p{Cf}]$/u;

// Inclusive ranges of East Asian Wide and Fullwidth code points, including emoji, which take up
// two columns. Sorted so that they can be binary searched.
const wideRanges: [number, number][] = [
  [0x1100, 0x115f],
  [0x231a, 0x231b],
  [0x2329, 0x232a],
  [0x23e9, 0x23ec],
  [0x23f0, 0x23f0],
  [0x23f3, 0x23f3],
  [0x25fd, 0x25fe],
  [0x2614, 0x2615],
  [0x2648, 0x2653],
  [0x267f, 0x267f],
  [0x2693, 0x2693],
  [0x26a1, 0x26a1],
  [0x26aa, 0x26ab],
  [0x26bd, 0x26be],
  [0x26c4, 0x26c5],
  [0x26ce, 0x26ce],
  [0x26d4, 0x26d4],
  [0x26ea, 0x26ea],
  [0x26f2, 0x26f3],
  [0x26f5, 0x26f5],
  [0x26fa, 0x26fa],
  [0x26fd, 0x26fd],
  [0x2705, 0x2705],
  [0x270a, 0x270b],
  [0x2728, 0x2728],
  [0x274c, 0x274c],
  [0x274e, 0x274e],
  [0x2753, 0x2755],
  [0x2757, 0x2757],
  [0x2795, 0x2797],
  [0x27b0, 0x27b0],
  [0x27bf, 0x27bf],
  [0x2b1b, 0x2b1c],
  [0x2b50, 0x2b50],
  [0x2b55, 0x2b55],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x16fe0, 0x16fe4],
  [0x17000, 0x18cff],
  [0x1b000, 0x1b2ff],
  [0x1f004, 0x1f004],
  [0x1f0cf, 0x1f0cf],
  [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a],
  [0x1f200, 0x1f202],
  [0x1f210, 0x1f23b],
  [0x1f240, 0x1f248],
  [0x1f250, 0x1f251],
  [0x1f260, 0x1f265],
  [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f7e0, 0x1f7eb],
  [0x1f900, 0x1f9ff],
  [0x1fa70, 0x1faff],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd]
];

/**
 * Number of columns taken up by a printable character, ignoring escape sequences, tabs and
 * control characters which are handled separately.
 */
export function charWidth(codePoint: number): number {
  if (codePoint !== 0xad && zeroWidthRegex.test(String.fromCodePoint(codePoint))) {
    return 0;
  }
  if (codePoint >= 0x1160 && codePoint <= 0x11ff) {
    // Hangul Jamo medial vowels and final consonants combine with the preceding character.
    return 0;
  }

  let lo = 0;
  let hi = wideRanges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = wideRanges[mid];
    if (codePoint < start) {
      hi = mid - 1;
    } else if (codePoint > end) {
      lo = mid + 1;
    } else {
      return 2;
    }
  }
  return 1;
}

/**
 * Index of the end of the character starting at index in text. A character is a code point
 * followed by any zero-width code points such as combining marks, so that it is edited as a
 * whole.
 */
export function nextCharIndex(text: string, index: number): number {
  let first = true;
  while (index < text.length) {
    const codePoint = text.codePointAt(index)!;
    if (!first && charWidth(codePoint) > 0) {
      break;
    }
    index += codePoint > 0xffff ? 2 : 1;
    first = false;
  }
  return index;
}

/**
 * Index of the start of the character before index in text.
 */
export function prevCharIndex(text: string, index: number): number {
  while (index > 0) {
    index--;
    if (
      index > 0 &&
      isLowSurrogate(text.charCodeAt(index)) &&
      isHighSurrogate(text.charCodeAt(index - 1))
    ) {
      index--;
    }
    if (charWidth(text.codePointAt(index)!) > 0) {
      break;
    }
  }
  return index;
}

/**
 * Number of columns taken up by a string of printable characters.
 */
export function stringWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += charWidth(char.codePointAt(0)!);
  }
  return width;
}
