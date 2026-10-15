import { parseAssignment } from './assignment';
import { expandFilenames } from './filename_expansion';
import { applyRedirects } from './redirects';
import { ansi } from '../ansi';
import type { ICommandRunner } from '../commands';
import type { IRunContext } from '../context';
import type { IShellImpl } from '../defs_internal';
import { Environment } from '../environment';
import { ErrorExitCode, FindCommandError, GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { expandToken, expandTokens } from '../expand';
import type { IInput, IOutput } from '../io';
import { Pipe, TerminalInput, TerminalOutput } from '../io';
import { CommandNode, parse, PipeNode } from '../parse';
import type { Token } from '../tokenize';

export interface ICommandExecutorHost {
  output(text: string): void;
  outputPrompt(promptIndex?: number): Promise<void>;
  setExitCode(exitCode: number): void;
}

export class CommandExecutor {
  constructor(
    private readonly _options: IShellImpl.IOptions,
    private readonly _runContext: IRunContext,
    private readonly _stderr: TerminalOutput,
    private readonly _dummyInput: IInput,
    private readonly _dummyOutput: IOutput,
    private readonly _host: ICommandExecutorHost
  ) {}

  private _nextCommandId(): number {
    return ++this._commandId;
  }

  async runCommands(cmdText: string): Promise<void> {
    if (cmdText.startsWith('!')) {
      // Get command from history and run that.
      const index = parseInt(cmdText.slice(1));
      const possibleCmd = this._runContext.history.at(index);
      if (possibleCmd === null) {
        // Does not set exit code.
        let text = '!' + index + ': event not found';
        if (this._options.color) {
          text = ansi.styleBoldRed + text + ansi.styleReset;
        }
        this._host.output(`${text}\n`);
        await this._host.outputPrompt();
        return;
      }
      cmdText = possibleCmd;
    }

    await this._options.enableBufferedStdinCallback(true);
    this._options.termios.setDefaultWasm();

    this._runContext.history.add(cmdText);

    let exitCode!: number;
    const stdin = new TerminalInput(
      timeoutMs => this._runContext.workerIO.pollInput(timeoutMs),
      maxChars => this._runContext.workerIO.read(maxChars),
      maxChars => this._runContext.workerIO.readAsync(maxChars, -1) // -1 means infinite wait
    );
    const stdout = new TerminalOutput(text => this._host.output(text));
    const stderr = this._stderr;
    try {
      const nodes = parse(cmdText, true, this._runContext.aliases);

      for (const node of nodes) {
        // '&&' and '||' run the next node only when the previous one succeeded or failed. Nodes
        // are joined left to right, so a skipped node leaves the exit code unchanged.
        if (node.separator === '&&' && exitCode !== 0) {
          continue;
        }
        if (node.separator === '||' && exitCode === 0) {
          continue;
        }
        if (node instanceof CommandNode) {
          exitCode = await this._runCommand(node, stdin, stdout, stderr, false);
        } else if (node instanceof PipeNode) {
          const { commands } = node;
          const n = commands.length;
          let prevPipe: Pipe;
          for (let i = 0; i < n; i++) {
            const input = i === 0 ? stdin : prevPipe!.input;
            const output = i < n - 1 ? (prevPipe = new Pipe()) : stdout;
            exitCode = await this._runCommand(commands[i], input, output, stderr, true);
          }
        } else {
          // This should not occur.
          throw new GeneralError(`Expected CommandNode or PipeNode not ${node}`);
        }
      }
    } catch (error: any) {
      if (error instanceof ErrorExitCode) {
        exitCode = error.exitCode;
      }
      stderr.write(error + '\n');
      stderr.flush();
    } finally {
      exitCode = exitCode ?? ExitCode.GENERAL_ERROR;
      this._host.setExitCode(exitCode);

      this._options.termios.setDefaultShell();
      await this._options.enableBufferedStdinCallback(false);
    }
  }

  private async _runCommand(
    commandNode: CommandNode,
    input: IInput,
    output: IOutput,
    error: IOutput,
    inPipeline: boolean
  ): Promise<number> {
    const head = commandNode.name;
    const tokens = head !== undefined ? [head, ...commandNode.suffix] : [];

    // Leading 'NAME=value' tokens before the command word are assignments. A command which is only
    // assignments defines them in the shell; otherwise they apply to that command alone.
    const k = this._assignmentCount(tokens);

    if (k === tokens.length && k > 0) {
      return this._runAssignmentsOnly(commandNode, tokens, k, input, output, error, inPipeline);
    }

    // Redirections are applied before the command is looked up: bash reports an ambiguous redirect
    // in preference to command not found, and creates the file before reporting the latter.
    ({ input, output, error } = applyRedirects(
      commandNode,
      input,
      output,
      error,
      this._runContext.environment,
      this._runContext.fileSystem,
      this._dummyInput,
      this._dummyOutput
    ));

    // A 'NAME=value' prefix applies to the command alone, and a later name in the prefix sees an
    // earlier one: 'B=1 C=$B cmd' runs cmd with C=1.
    const saved_env: Environment = this._runContext.environment;
    let environment: Environment = saved_env;
    let temporary: boolean = false;
    if (k > 0) {
      environment = new Environment(this._runContext.environment);
      temporary = true;
      for (let i = 0; i < k; i++) {
        this._assign(tokens[i], environment);
      }
    }

    const name = tokens[k]?.value ?? '';
    const runner = this._runContext.commandRegistry.get(name);
    if (name !== '' && runner === null) {
      // Give location of command in input?
      throw new FindCommandError(name);
    }
    if (runner === null) {
      this._flushOutputs(output, error);
      if (temporary) {
        this._runContext.environment = saved_env;
      }
      return ExitCode.SUCCESS;
    }

    return this._executeCommand(
      runner,
      name,
      tokens,
      k,
      environment,
      saved_env,
      temporary,
      input,
      output,
      error
    );
  }

  /**
   * Count the number of assignment tokens at the start of the token list.
   * @param tokens The tokens representing the command and its arguments.
   * @returns The number of assignment tokens at the start of the token list.
   */
  private _assignmentCount(tokens: Token[]): number {
    let count = 0;
    while (count < tokens.length && parseAssignment(tokens[count]) !== undefined) {
      count++;
    }
    return count;
  }

  /**
   * Run only the assignment part of a command, without executing the command itself.
   * Handles input/output redirections and temporary environment changes for pipeline elements.
   * @param commandNode The command node representing the command in the AST.
   * @param tokens The tokens representing the command and its arguments.
   * @param assignmentCount The number of assignment tokens at the start of the command.
   * @param input The input stream for the command.
   * @param output The output stream for the command.
   * @param error The error stream for the command.
   * @param inPipeline Whether the command is part of a pipeline.
   * @returns The exit code of the assignment execution.
   */
  private _runAssignmentsOnly(
    commandNode: CommandNode,
    tokens: Token[],
    assignmentCount: number,
    input: IInput,
    output: IOutput,
    error: IOutput,
    inPipeline: boolean
  ): number {
    // bash runs a pipeline element in a subshell, so 'A=1 | cat' discards the assignment.
    const environment = inPipeline
      ? new Environment(this._runContext.environment)
      : this._runContext.environment;
    for (let i = 0; i < assignmentCount; i++) {
      this._assign(tokens[i], environment);
    }
    // The assignment happens before the redirections, so 'A=f > $A' writes to f.
    // eslint-disable-next-line no-useless-assignment
    ({ input, output, error } = applyRedirects(
      commandNode,
      input,
      output,
      error,
      environment,
      this._runContext.fileSystem,
      this._dummyInput,
      this._dummyOutput
    ));
    this._flushOutputs(output, error);
    return ExitCode.SUCCESS;
  }

  /**
   * Execute a command with the given runner, name, tokens, and environment.
   * Handles temporary environment changes and input/output redirections.
   * @param runner The command runner to execute.
   * @param name The name of the command.
   * @param tokens The tokens representing the command and its arguments.
   * @param assignmentCount The number of assignment tokens at the start of the command.
   * @param environment The current environment for the command.
   * @param savedEnvironment The saved environment to restore if temporary changes were made.
   * @param temporaryEnvironment Whether the environment changes are temporary.
   * @param input The input stream for the command.
   * @param output The output stream for the command.
   * @param error The error stream for the command.
   * @returns The exit code of the executed command.
   */
  private async _executeCommand(
    runner: ICommandRunner,
    name: string,
    tokens: Token[],
    assignmentCount: number,
    environment: Environment,
    savedEnvironment: Environment,
    temporaryEnvironment: boolean,
    input: IInput,
    output: IOutput,
    error: IOutput
  ): Promise<number> {
    let commandId: number = -1; // eslint-disable-line no-useless-assignment
    let exitCode: number = ExitCode.SUCCESS; // eslint-disable-line no-useless-assignment
    try {
      let args: string[] = expandTokens(tokens.slice(assignmentCount + 1), environment);
      args = expandFilenames(args, this._runContext.fileSystem);
      commandId = this._nextCommandId();
      this._runContext.commandId = commandId;
      this._runContext.name = name;
      this._runContext.args = [...args];
      this._runContext.stdin = input;
      this._runContext.stdout = output;
      this._runContext.stderr = error;
      this._runContext.environment = environment;

      this._options.commandStateChangedCallback({
        commandId,
        name,
        args,
        state: 'loading'
      });

      exitCode = await runner.run(this._runContext);
    } finally {
      this._flushOutputs(output, error);

      // Reset properties of IContext.
      this._runContext.commandId = -1;
      this._runContext.name = '';
      this._runContext.args = [];
      this._runContext.stdin = this._dummyInput;
      this._runContext.stdout = this._dummyOutput;
      this._runContext.stderr = this._dummyOutput;

      if (temporaryEnvironment) {
        this._runContext.environment = savedEnvironment;
      }
    }

    this._options.commandStateChangedCallback({
      commandId,
      exitCode,
      state: 'finished'
    });
    return exitCode;
  }

  /**
   * Flush the output and error streams, ensuring that any buffered data is written out.
   * If the output and error streams are the same, flush only once to avoid truncating the file.
   * @param output The output stream to be flushed.
   * @param error The error stream to be flushed.
   */
  private _flushOutputs(output: IOutput, error: IOutput): void {
    if (error === output) {
      output.flush();
    } else {
      error.flush();
      output.flush();
    }
  }

  /** Set the variable named by an assignment token in an environment, expanding its value against
   * that environment so that a later name in the same prefix sees an earlier one.
   * @param token The assignment token to be processed.
   * @param environment The environment in which the assignment should be applied.
   */
  private _assign(token: Token, environment: Environment): void {
    const assignment = parseAssignment(token);
    if (assignment !== undefined) {
      const [name] = assignment;
      environment.set(name, expandToken(token, environment).slice(name.length + 1));
    }
  }

  private _commandId = -1;
}
