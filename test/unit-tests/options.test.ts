import {
  BooleanOption,
  OptionalStringOption,
  TrailingStringsOption
} from '../../src/builtin/option';
import { Options } from '../../src/builtin/options';

class BooleanOptions extends Options {
  flag = new BooleanOption('f', 'flag', 'some flag');
  bool = new BooleanOption('b', 'bool', 'other flag');
}

class TrailingOptions extends Options {
  flag = new BooleanOption('f', 'flag', 'some flag');
  trailingStrings = new TrailingStringsOption(0);
}

class AtLeastOneTrailingOptions extends Options {
  trailingStrings = new TrailingStringsOption(1);
}

class OptStringOptions extends Options {
  flag = new BooleanOption('f', 'flag', 'some flag');
  possibleString = new OptionalStringOption('p', '', 'possible string');
}

describe('Options', () => {
  test('should support boolean options', () => {
    const options0 = new BooleanOptions().parse([]);
    expect(options0.flag.isSet).toBeFalsy();
    expect(options0.bool.isSet).toBeFalsy();

    const options1 = new BooleanOptions().parse(['-f']);
    expect(options1.flag.isSet).toBeTruthy();
    expect(options1.bool.isSet).toBeFalsy();

    const options2 = new BooleanOptions().parse(['--flag', '-b']);
    expect(options2.flag.isSet).toBeTruthy();
    expect(options2.bool.isSet).toBeTruthy();
  });

  test('should throw error on unrecognised option', () => {
    expect(() => new BooleanOptions().parse(['-x'])).toThrow(/No such shortName option 'x'/);
    expect(() => new BooleanOptions().parse(['--xyz'])).toThrow(/No such longName option 'xyz'/);
    expect(() => new BooleanOptions().parse(['abc'])).toThrow(/Unrecognised option: 'abc'/);
  });

  test('should support trailing strings', () => {
    const options0 = new TrailingOptions().parse([]);
    expect(options0.trailingStrings.length).toEqual(0);
    expect(options0.trailingStrings.strings).toEqual([]);
    expect(options0.trailingStrings.isSet).toBeFalsy();

    const options1 = new TrailingOptions().parse(['xyz']);
    expect(options1.trailingStrings.length).toEqual(1);
    expect(options1.trailingStrings.strings).toEqual(['xyz']);
    expect(options1.trailingStrings.isSet).toBeTruthy();

    const options2 = new TrailingOptions().parse(['abc', 'def']);
    expect(options2.trailingStrings.length).toEqual(2);
    expect(options2.trailingStrings.strings).toEqual(['abc', 'def']);
    expect(options2.trailingStrings.isSet).toBeTruthy();
  });

  test('should throw error on option after trailing strings', () => {
    expect(() => new TrailingOptions().parse(['abc', '-f'])).toThrow(
      /Cannot have named option after parsing a trailing path/
    );
  });

  test('should support minimum number of trailing strings', () => {
    const options = new AtLeastOneTrailingOptions().parse(['abc']);
    expect(options.trailingStrings.length).toEqual(1);
    expect(options.trailingStrings.strings).toEqual(['abc']);
    expect(options.trailingStrings.isSet).toBeTruthy();

    expect(() => new AtLeastOneTrailingOptions().parse([])).toThrow(
      /Insufficient trailing strings options specified/
    );
  });

  test('should support optional string', () => {
    const options0 = new OptStringOptions().parse([]);
    expect(options0.possibleString.isSet).toBeFalsy();
    expect(options0.possibleString.string).toBeUndefined();
    expect(options0.flag.isSet).toBeFalsy();

    const options1 = new OptStringOptions().parse(['-p']);
    expect(options1.possibleString.isSet).toBeTruthy();
    expect(options1.possibleString.string).toBeUndefined();
    expect(options1.flag.isSet).toBeFalsy();

    const options2 = new OptStringOptions().parse(['-p', 'abc']);
    expect(options2.possibleString.isSet).toBeTruthy();
    expect(options2.possibleString.string).toEqual('abc');
    expect(options2.flag.isSet).toBeFalsy();
  });

  test('should continue after optional string', () => {
    const options0 = new OptStringOptions().parse(['-p', '-f']);
    expect(options0.possibleString.isSet).toBeTruthy();
    expect(options0.possibleString.string).toBeUndefined();
    expect(options0.flag.isSet).toBeTruthy();

    const options1 = new OptStringOptions().parse(['-p', 'abc', '-f']);
    expect(options1.possibleString.isSet).toBeTruthy();
    expect(options1.possibleString.string).toEqual('abc');
    expect(options1.flag.isSet).toBeTruthy();
  });
});
