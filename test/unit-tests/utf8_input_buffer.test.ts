import { Utf8InputBuffer } from '../../src/commands/utf8_input_buffer';

describe('Utf8InputBuffer', () => {
  test('should encode ascii characters', () => {
    const buffer = new Utf8InputBuffer();
    buffer.fill(() => [104, 105], 8192);

    expect(buffer.length).toBe(2);
    expect(buffer.readByte()).toBe(104);
    expect(buffer.readByte()).toBe(105);
    expect(buffer.readByte()).toBeNull();
  });

  test('should encode multi-byte characters and surrogate pairs', () => {
    const buffer = new Utf8InputBuffer();
    buffer.fill(() => [0x00e9, 0x2502, 0xd83c, 0xdf89], 4);

    expect(Array.from(buffer.take(9))).toEqual([
      0xc3, 0xa9, 0xe2, 0x94, 0x82, 0xf0, 0x9f, 0x8e, 0x89
    ]);
  });

  test('should join a surrogate pair split between reads', () => {
    const buffer = new Utf8InputBuffer();
    const chunks: number[][] = [[65, 0xd83c], [0xdf89]];
    const readChars = () => chunks.shift() ?? [];

    buffer.fill(readChars, 2);
    expect(Array.from(buffer.take(1))).toEqual([65]);

    buffer.fill(readChars, 2);
    expect(Array.from(buffer.take(4))).toEqual([0xf0, 0x9f, 0x8e, 0x89]);
  });

  test('should encode an unpaired high surrogate at end of input as the replacement character', () => {
    const buffer = new Utf8InputBuffer();
    buffer.fill(() => [0xd83c], 1);

    expect(Array.from(buffer.take(3))).toEqual([0xef, 0xbf, 0xbd]);
  });

  test('should request at most maxChars characters per read', () => {
    const buffer = new Utf8InputBuffer();
    const requested: number[] = [];
    buffer.fill(maxChars => {
      requested.push(maxChars);
      return [104];
    }, 4096);

    expect(requested).toEqual([4096]);
  });

  test('should report the remaining length and take at most the requested bytes', () => {
    const buffer = new Utf8InputBuffer();
    buffer.fill(() => [104, 105, 106, 107], 4);

    expect(buffer.length).toBe(4);
    expect(Array.from(buffer.take(2))).toEqual([104, 105]);
    expect(buffer.length).toBe(2);
    expect(buffer.readByte()).toBe(106);
    expect(buffer.length).toBe(1);
    expect(buffer.readByte()).toBe(107);
    expect(buffer.readByte()).toBeNull();
  });
});
