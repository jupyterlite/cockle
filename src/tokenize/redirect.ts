/** Redirection operators. */
const redirectOperators: string[] = [
  '<',
  '<<',
  '<<-',
  '<<<',
  '<>',
  '<&',
  '>',
  '>>',
  '>|',
  '>&',
  '&>',
  '&>>'
];

/** The redirection operator of a token value, without any leading file descriptor digits. */
export function redirectOperator(value: string): string {
  return value.replace(/^\d+/, '');
}

/** Whether a token value is a redirection, optionally preceded by a file descriptor number. */
export function isRedirectToken(value: string): boolean {
  return redirectOperators.includes(redirectOperator(value));
}

/**
 * Split a redirection token value into its file descriptor and operator. The file descriptor
 * defaults to standard input for '<' operators and to standard output otherwise.
 */
export function splitRedirect(value: string): { fd: number; operator: string } {
  const digits: RegExpExecArray | null = /^(\d+)/.exec(value);
  const operator: string = redirectOperator(value);
  const fd: number = digits !== null ? parseInt(digits[1], 10) : operator.startsWith('<') ? 0 : 1;
  return { fd, operator };
}

/** Whether appending char to an in-progress token continues a redirection operator. */
export function extendsRedirect(value: string, char: string): boolean {
  const digits: RegExpExecArray | null = /^\d+/.exec(value);
  const operator: string = (digits !== null ? value.slice(digits[0].length) : value) + char;
  if (digits !== null && operator.startsWith('&')) {
    // A file descriptor never precedes '&>' or '&>>'.
    return false;
  }
  return redirectOperators.some(op => op.startsWith(operator));
}
