import { MockTerminalStdin } from '../util';
import { TerminalInput } from '../../src/io';

describe('TerminalInput', () => {
  it('should return 4 (EOT) if no callback', async () => {
    const terminalInput = new TerminalInput();
    for (let i = 0; i < 5; i++) {
      const charCodes = terminalInput.readChar();
      expect(charCodes).toEqual([4]);
    }
  });

  it('should call callback one character at a time until EOT', async () => {
    const mockStdin = new MockTerminalStdin();
    for (let i = 0; i < 10; i++) {
      const terminalInput = new TerminalInput(mockStdin.stdinCallback.bind(mockStdin));
      const charCodes = terminalInput.readChar();
      const lookup = {
        0: 90,
        1: 100,
        2: 122,
        3: 32,
        4: 100
      };
      const expected = lookup[i] ?? 4;
      expect(charCodes).toEqual([expected]);
    }
    expect(mockStdin.callCount).toEqual(10);
  });
});
