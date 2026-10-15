import type { Utf8InputBuffer } from './utf8_input_buffer';
import type { IInput, IOutput } from '../../io';

/**
 * Number of characters of stdin to read and convert to UTF-8 at a time. Reading and converting
 * characters in chunks is much faster than one character at a time.
 */
const INPUT_CHARS_PER_READ = 8192;

/**
 * Handler which receives the output bytes of a wasm command, one at a time, and must be flushed
 * when the command has finished.
 */
export interface IOutputHandler {
  write: (x: number) => void;
  flush: () => void;
}

/**
 * By default a WebAssembly command assumes stdin is a terminal (TTY). If this is not the case,
 * provide an input reading wrapper. The returned function supplies the UTF-8 bytes expected by the
 * WebAssembly command, one byte at a time. With this, WebAssembly commands can use `isatty`
 * correctly.
 */
export function createStdinHandler(
  input: IInput,
  inputBytes: Utf8InputBuffer
): (() => number | null | undefined) | undefined {
  if (input.isTerminal()) {
    return undefined;
  }

  const readChars = (maxChars: number) => input.read(maxChars);
  return () => {
    inputBytes.fill(readChars, INPUT_CHARS_PER_READ);
    return inputBytes.readByte();
  };
}

/**
 * By default a WebAssembly command assumes stdout and stderr are terminals (TTYs). If this is not
 * the case, provide an output writing wrapper. The WebAssembly command writes UTF-8 bytes, one
 * byte at a time. Decode them to characters using a streaming decoder, as a multi-byte character
 * may be split over multiple calls, and batch the bytes before passing them to the output. The
 * returned write function must be called with one byte at a time, then flush() must be called when
 * the command has finished.
 */
export function createOutputHandler(output: IOutput): IOutputHandler | undefined {
  if (output.isTerminal()) {
    return undefined;
  }

  const decoder = new TextDecoder('utf-8');
  const staging = new Uint8Array(1024);
  let count = 0;

  const flush = (final: boolean) => {
    let text = '';
    if (count > 0) {
      text = decoder.decode(staging.subarray(0, count), { stream: !final });
      count = 0;
    } else if (final) {
      // Emit the replacement character for an incomplete character at the end of the output.
      text = decoder.decode();
    }
    if (text.length > 0) {
      output.write(text);
    }
  };

  return {
    write: (x: number) => {
      staging[count++] = x;
      if (count === staging.length || x === 10) {
        // Flush when the buffer is full, or at the end of a line, so that the output is
        // available incrementally.
        flush(false);
      }
    },
    flush: () => flush(true)
  };
}
