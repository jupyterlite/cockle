import { ExitCode } from './exit_code';

export abstract class ErrorExitCode extends Error {
  constructor(
    readonly exitCode: number,
    message: string
  ) {
    super(message);
  }
}

export class FindCommandError extends ErrorExitCode {
  constructor(commandName: string) {
    super(ExitCode.CANNOT_FIND_COMMAND, `'${commandName}': command not found`);
  }
}

export class GeneralError extends ErrorExitCode {
  constructor(message: string) {
    super(ExitCode.GENERAL_ERROR, message);
  }
}

export class ImproperUseError extends ErrorExitCode {
  constructor(message: string) {
    super(ExitCode.IMPROPER_USE, message);
  }
}

export class RunCommandError extends ErrorExitCode {
  constructor(commandName: string, message: string) {
    super(ExitCode.CANNOT_RUN_COMMAND, `'${commandName}': ${message}`);
  }
}
