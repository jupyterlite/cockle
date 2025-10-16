import { BooleanArgument, OptionalStringArgument, PositionalArguments } from '../../src/argument';
import { CommandArguments, SubcommandArguments } from '../../src/arguments';

class BooleanArgs extends CommandArguments {
  flag = new BooleanArgument('f', 'flag', 'some flag');
  bool = new BooleanArgument('b', 'bool', 'other flag');
}

class PositionalArgs extends CommandArguments {
  flag = new BooleanArgument('f', 'flag', 'some flag');
  positional = new PositionalArguments();
}

class AtLeastOnePositionalArgs extends CommandArguments {
  positional = new PositionalArguments({ min: 1 });
}

class MaxTwoPositionalArgs extends CommandArguments {
  positional = new PositionalArguments({ max: 2 });
}

class OptionalStringArgs extends CommandArguments {
  flag = new BooleanArgument('f', 'flag', 'some flag');
  possibleString = new OptionalStringArgument('p', '', 'possible string');
}

class ASubcommandArgs extends SubcommandArguments {
  version = new BooleanArgument('v', 'version', 'subcommand version');
}

class WithSubcommanArgs extends CommandArguments {
  version = new BooleanArgument('v', 'version', 'command version');
  subcommands = {
    asub: new ASubcommandArgs('asub', 'example subcommand')
  };
}

describe('CommandArguments', () => {
  test('should support boolean arguments', () => {
    const args0 = new BooleanArgs().parse([]);
    expect(args0.flag.isSet).toBeFalsy();
    expect(args0.bool.isSet).toBeFalsy();

    const args1 = new BooleanArgs().parse(['-f']);
    expect(args1.flag.isSet).toBeTruthy();
    expect(args1.bool.isSet).toBeFalsy();

    const args2 = new BooleanArgs().parse(['--flag', '-b']);
    expect(args2.flag.isSet).toBeTruthy();
    expect(args2.bool.isSet).toBeTruthy();
  });

  test('should validate length of argument short and long names', () => {
    expect(() => new BooleanArgument('ff', '', 'some flag')).toThrow(
      /Argument shortName ff must be a string of length 1/
    );
    expect(() => new BooleanArgument('', 'f', 'some flag')).toThrow(
      /Argument longName f must be a string of length greater than 1/
    );
  });

  test('should throw error on unrecognised argument', () => {
    expect(() => new BooleanArgs().parse(['-x'])).toThrow(/No such shortName argument 'x'/);
    expect(() => new BooleanArgs().parse(['--xyz'])).toThrow(/No such longName argument 'xyz'/);
    expect(() => new BooleanArgs().parse(['abc'])).toThrow(/Unrecognised argument: 'abc'/);
  });

  test('should support positional arguments', () => {
    const args0 = new PositionalArgs().parse([]);
    expect(args0.positional.length).toEqual(0);
    expect(args0.positional.strings).toEqual([]);
    expect(args0.positional.isSet).toBeFalsy();

    const args1 = new PositionalArgs().parse(['xyz']);
    expect(args1.positional.length).toEqual(1);
    expect(args1.positional.strings).toEqual(['xyz']);
    expect(args1.positional.isSet).toBeTruthy();

    const args2 = new PositionalArgs().parse(['abc', 'def']);
    expect(args2.positional.length).toEqual(2);
    expect(args2.positional.strings).toEqual(['abc', 'def']);
    expect(args2.positional.isSet).toBeTruthy();
  });

  test('should throw error on argument after positional arguments', () => {
    expect(() => new PositionalArgs().parse(['abc', '-f'])).toThrow(
      /Cannot have named argument after positional arguments/
    );
  });

  test('should support minimum number of positional arguments', () => {
    const arga = new AtLeastOnePositionalArgs().parse(['abc']);
    expect(arga.positional.length).toEqual(1);
    expect(arga.positional.strings).toEqual(['abc']);
    expect(arga.positional.isSet).toBeTruthy();

    expect(() => new AtLeastOnePositionalArgs().parse([])).toThrow(
      /Insufficient positional arguments/
    );
  });

  test('should support maximum number of positional arguments', () => {
    const args0 = new MaxTwoPositionalArgs().parse([]);
    expect(args0.positional.length).toEqual(0);
    expect(args0.positional.strings).toEqual([]);
    expect(args0.positional.isSet).toBeFalsy();

    const args1 = new MaxTwoPositionalArgs().parse(['abc']);
    expect(args1.positional.length).toEqual(1);
    expect(args1.positional.strings).toEqual(['abc']);
    expect(args1.positional.isSet).toBeTruthy();

    const args2 = new MaxTwoPositionalArgs().parse(['abc', 'def']);
    expect(args2.positional.length).toEqual(2);
    expect(args2.positional.strings).toEqual(['abc', 'def']);
    expect(args2.positional.isSet).toBeTruthy();

    expect(() => new MaxTwoPositionalArgs().parse(['abc', 'def', 'ghi'])).toThrow(
      /Too many positional arguments/
    );
  });

  test('should support optional string argument', () => {
    const args0 = new OptionalStringArgs().parse([]);
    expect(args0.possibleString.isSet).toBeFalsy();
    expect(args0.possibleString.string).toBeUndefined();
    expect(args0.flag.isSet).toBeFalsy();

    const args1 = new OptionalStringArgs().parse(['-p']);
    expect(args1.possibleString.isSet).toBeTruthy();
    expect(args1.possibleString.string).toBeUndefined();
    expect(args1.flag.isSet).toBeFalsy();

    const args2 = new OptionalStringArgs().parse(['-p', 'abc']);
    expect(args2.possibleString.isSet).toBeTruthy();
    expect(args2.possibleString.string).toEqual('abc');
    expect(args2.flag.isSet).toBeFalsy();
  });

  test('should continue after optional string', () => {
    const args0 = new OptionalStringArgs().parse(['-p', '-f']);
    expect(args0.possibleString.isSet).toBeTruthy();
    expect(args0.possibleString.string).toBeUndefined();
    expect(args0.flag.isSet).toBeTruthy();

    const args1 = new OptionalStringArgs().parse(['-p', 'abc', '-f']);
    expect(args1.possibleString.isSet).toBeTruthy();
    expect(args1.possibleString.string).toEqual('abc');
    expect(args1.flag.isSet).toBeTruthy();
  });

  test('should support subcommand', () => {
    const args0 = new WithSubcommanArgs().parse(['-v']);
    expect(args0.version.isSet).toBeTruthy();
    expect(args0.subcommands.asub.isSet).toBeFalsy();
    expect(args0.subcommands.asub.version.isSet).toBeFalsy();

    const args1 = new WithSubcommanArgs().parse(['asub']);
    expect(args1.version.isSet).toBeFalsy();
    expect(args1.subcommands.asub.isSet).toBeTruthy();
    expect(args1.subcommands.asub.version.isSet).toBeFalsy();

    const args2 = new WithSubcommanArgs().parse(['asub', '-v']);
    expect(args2.version.isSet).toBeFalsy();
    expect(args2.subcommands.asub.isSet).toBeTruthy();
    expect(args2.subcommands.asub.version.isSet).toBeTruthy();
  });
});
