import { FindCommandError } from '../../src/error_exit_code';

describe('FindCommandError', () => {
  test('should show non-printable characters as escape codes', () => {
    expect(new FindCommandError('\x01ls​').message).toEqual(
      "'\\u0001ls\\u200b': command not found"
    );
  });

  test('should leave printable characters unchanged', () => {
    expect(new FindCommandError('abc£🚀').message).toEqual("'abc£🚀': command not found");
  });
});
