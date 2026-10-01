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

export class LoadCommandError extends ErrorExitCode {
  constructor(commandName: string) {
    super(ExitCode.CANNOT_FIND_COMMAND, `'${commandName}': cannot load command`);
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
  constructor(commandName: string) {
    super(ExitCode.CANNOT_RUN_COMMAND, `'${commandName}': cannot run command`);
  }
}

/** Error for a redirection to a file descriptor that the shell does not support. */
export function unsupportedRedirect(token: string, fd: number): GeneralError {
  return new GeneralError(`Redirect '${token}' to file descriptor ${fd} is not supported`);
}
