import type { Utf8InputBuffer } from './utf8_input_buffer';
import type { IWorkerIO } from '../../buffered_io';
import type { ISizeCallback } from '../../callback';
import type { IInput, IOutput } from '../../io';
import type { Termios } from '../../termios';
import type { MainModule } from '../../types/wasm_module';

/**
 * TTY operations of a WebAssembly command: termios and window size ioctls, and the stream
 * operations used when the command reads its input from or writes its output to a TTY.
 */
export class WasmTty {
  constructor(
    private readonly _input: IInput,
    private readonly _output: IOutput,
    private readonly _error: IOutput,
    private readonly _workerIO: IWorkerIO,
    private readonly _termios: Termios.ITermios,
    private readonly _size: ISizeCallback,
    private readonly _inputBytes: Utf8InputBuffer,
    private readonly _avoidInfinitePollTimeout: boolean
  ) {}

  /**
   * Monkey patch termios and window size ioctls, and stream operations, of the wasm module.
   */
  attach(module: MainModule): void {
    if (module.TTY === undefined) {
      return;
    }

    const { default_tty_ops, default_tty1_ops, stream_ops } = module.TTY;

    default_tty_ops.ioctl_tcgets = this._getTermios.bind(this);
    default_tty_ops.ioctl_tcsets = this._setTermios.bind(this);
    default_tty_ops.ioctl_tiocgwinsz = this._getSize.bind(this);

    default_tty1_ops.ioctl_tcgets = this._getTermios.bind(this);
    default_tty1_ops.ioctl_tcsets = this._setTermios.bind(this);
    default_tty1_ops.ioctl_tiocgwinsz = this._getSize.bind(this);

    // May only need to be for some TTYs?
    stream_ops.poll = this._poll.bind(this);
    stream_ops.read = this._read.bind(this);
    stream_ops.write = this._write.bind(this);
  }

  private _getTermios(tty: any): Termios.IFlags {
    return this._termios.get();
  }

  private _setTermios(tty: any, optional_actions: any, data: Termios.IFlags): number {
    // TODO: handle optional_actions
    this._termios.set(data);
    return 0;
  }

  private _getSize(tty: any): [number, number] {
    const { rows, columns } = this._size();
    return [rows, columns];
  }

  private _poll(stream: any, timeoutMs: number): number {
    // Constants.
    const POLLIN = 1;
    const POLLOUT = 4;

    if (this._avoidInfinitePollTimeout && timeoutMs < 0) {
      // `less` polls multiple file descriptors at the same time with infinite timeout which end
      // up running sequentially here, workaround is for them to return immediately.
      timeoutMs = 0;
    }

    let readable = this._inputBytes.length > 0;
    if (!readable) {
      readable = this._input.finished
        ? this._workerIO.pollInput(timeoutMs)
        : this._input.poll(timeoutMs);
    }
    const writable = true;
    return (readable ? POLLIN : 0) | (writable ? POLLOUT : 0);
  }

  private _read(
    stream: any,
    buffer: Int8Array,
    offset: number,
    length: number,
    position: any
  ): number {
    if (length === 0) {
      // No buffer to store in.
      return 0;
    }

    if (this._inputBytes.length === 0) {
      this._inputBytes.fill(this._readCharsFromStdin.bind(this), length);
    }

    // Do not pass more bytes to the wasm command than fit in the buffer.
    const bytes = this._inputBytes.take(length);
    buffer.set(bytes, offset);
    return bytes.length;
  }

  private _write(stream: any, buffer: Int8Array, offset: number, length: number, pos: any): number {
    if (length === 0) {
      return 0;
    }

    const chars = buffer.subarray(offset, offset + length);
    const text = this._workerIO.utf8ArrayToString(chars);
    const isStderr = stream.path === '/dev/tty1';

    const output = isStderr ? this._error : this._output;
    output.write(text);
    return length;
  }

  /**
   * Read characters from stdin for the wasm command. Called many times as the command reads its
   * input.
   */
  private _readCharsFromStdin(maxChars: number): number[] {
    let chars: number[] = this._input.finished
      ? this._workerIO.read(maxChars)
      : this._input.read(maxChars);
    if (chars.length === 1 && chars[0] === 4) {
      // End of text (e.g. Ctrl+D typed at the terminal): treat as the end of the input.
      chars = [];
    }
    return chars;
  }
}
