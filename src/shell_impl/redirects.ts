import { GeneralError, unsupportedRedirect } from '../error_exit_code';
import { expandHeredoc, expandToken, splitToken } from '../expand';
import type { IFileSystem } from '../file_system';
import type { IInput, IOutput } from '../io';
import { FileInput, FileOutput, StringInput } from '../io';
import type { CommandNode } from '../parse';
import { splitRedirect } from '../tokenize';

export function applyRedirects(
  commandNode: CommandNode,
  input: IInput,
  output: IOutput,
  error: IOutput,
  environment: ReadonlyMap<string, string>,
  fileSystem: IFileSystem,
  dummyInput: IInput,
  dummyOutput: IOutput
): { input: IInput; output: IOutput; error: IOutput } {
  if (commandNode.redirects) {
    for (const redirect of commandNode.redirects) {
      // Redirects take effect left to right, so duplicating a file descriptor copies whichever
      // target it points to at that moment. When several redirects target the same descriptor,
      // the last one wins.
      const token = redirect.token.value;
      const word = redirect.target.value;
      const { fd, operator } = splitRedirect(token);

      // A redirect target is expanded and split as a normal word is: 'OUT=f; echo hi > $OUT'
      // writes to 'f'. A here string is not split, so it keeps its single value.
      const fields =
        operator === '<<<'
          ? [expandToken(redirect.target, environment)]
          : splitToken(redirect.target, environment);
      if (fields.length !== 1) {
        // bash reports the unexpanded word: 'A="a b"; echo hi > $A' gives '$A: ambiguous redirect'.
        throw new GeneralError(`${word}: ambiguous redirect`);
      }
      const target = fields[0];

      switch (operator) {
        case '>':
        case '>|':
        case '>>': {
          const append: boolean = operator === '>>';
          const fileOutput = new FileOutput(fileSystem, target, append);
          if (fd === 1) {
            output = fileOutput;
          } else if (fd === 2) {
            error = fileOutput;
          } else {
            throw unsupportedRedirect(token, fd);
          }
          break;
        }

        case '&>':
        case '&>>': {
          // Both standard output and standard error ('cmd &> file').
          const appendBoth: boolean = operator === '&>>';
          output = error = new FileOutput(fileSystem, target, appendBoth);
          break;
        }

        case '<':
        case '<>': {
          if (fd !== 0) {
            throw unsupportedRedirect(token, fd);
          }
          // '<> file' opens for reading and writing. cockle commands only read from stdin.
          const readWrite: boolean = operator === '<>';
          input = new FileInput(fileSystem, target, readWrite);
          break;
        }

        case '<<':
        case '<<-': {
          const body: string | undefined = redirect.token.heredoc;
          if (body === undefined) {
            // Should not occur as the shell only runs complete commands.
            throw new GeneralError('Here document is incomplete');
          }
          // A quoted delimiter makes the body literal; otherwise it is expanded but not split,
          // as in bash. Backslash removal within double quotes does not apply here.
          const content: string = redirect.token.quotedDelimiter
            ? body
            : expandHeredoc(body, environment);
          input = new StringInput(content);
          break;
        }

        case '<<<':
          if (fd !== 0) {
            throw unsupportedRedirect(token, fd);
          }
          // Here string: 'cat <<< hello'.
          input = new StringInput(`${target}\n`);
          break;

        case '<&':
          if (fd !== 0) {
            throw unsupportedRedirect(token, fd);
          } else if (target === '-') {
            // Closed standard input, reads return nothing.
            input = dummyInput;
          } else if (target !== '0') {
            throw new GeneralError(`Redirect '${token}${target}' is not supported`);
          }
          break;

        case '>&': {
          const match = /^(\d*)(-?)$/.exec(target);

          if (match === null) {
            // A word that is not a file descriptor redirects both streams: 'cmd >& file'.
            output = error = new FileOutput(fileSystem, target, false);
            break;
          }

          // A bare '-' closes this file descriptor: 'cmd 2>&-'.
          const targetFd = match[1] === '' ? fd : parseInt(match[1], 10);
          if (fd === 1 && targetFd === 2) {
            output = error;
          } else if (fd === 2 && targetFd === 1) {
            error = output;
          } else if (fd !== targetFd || (fd !== 1 && fd !== 2)) {
            throw new GeneralError(`Redirect '${token}${target}' is not supported`);
          }

          if (match[2] === '-') {
            // Moving a file descriptor closes the target: '2>&1-'
            if (targetFd === 1) {
              output = dummyOutput;
            } else {
              error = dummyOutput;
            }
          }
          break;
        }

        default:
          throw new GeneralError(`Unrecognised redirect ${token}`);
      }
    }
  }

  return { input, output, error };
}
