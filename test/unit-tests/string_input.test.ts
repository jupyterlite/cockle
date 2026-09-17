import { StringInput } from '../../src/io/string_input';

describe('StringInput', () => {
  test('should read all content', () => {
    const input = new StringInput('hello\n');
    expect(input.isTerminal()).toBe(false);
    expect(input.poll(0)).toBe(true);
    expect(input.readAll()).toBe('hello\n');
  });
});
