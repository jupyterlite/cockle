import { parseAssignment } from '../../src/shell_impl';
import { tokenize } from '../../src/tokenize';

/** Parse the first token of source as a `NAME=value` assignment. */
function assignment(source: string): [string, string] | undefined {
  return parseAssignment(tokenize(source)[0]);
}

describe('parseAssignment', () => {
  test('should parse a simple assignment', () => {
    expect(assignment('A=1')).toEqual(['A', '1']);
    expect(assignment('_A_2=')).toEqual(['_A_2', '']);
  });

  test('should keep everything after the first equals sign in the value', () => {
    expect(assignment('A=B=1')).toEqual(['A', 'B=1']);
    expect(assignment("A='b=c'")).toEqual(['A', 'b=c']);
    expect(assignment("A=b'='c")).toEqual(['A', 'b=c']);
  });

  test('should reject a name which is not a valid identifier', () => {
    // bash reports command not found for all of these.
    expect(assignment('1X=2')).toBeUndefined();
    expect(assignment('=1')).toBeUndefined();
    expect(assignment('A-B=1')).toBeUndefined();
    expect(assignment('A.1=2')).toBeUndefined();
    expect(assignment('A@1=2')).toBeUndefined();
    expect(assignment("'A x'=1")).toBeUndefined();
  });

  test('should reject a name containing a dollar or quote character', () => {
    // The name is not expanded or unquoted: bash runs 'A$B=1' and "'X'=1" as commands.
    expect(assignment('A$B=1')).toBeUndefined();
    expect(assignment("'X'=1")).toBeUndefined();
    expect(assignment('"X"=1')).toBeUndefined();
    expect(assignment("A'x'=1")).toBeUndefined();
    expect(assignment("pre'X'=1")).toBeUndefined();
  });

  test('should reject a token which is not an assignment', () => {
    expect(assignment('echo')).toBeUndefined();
    expect(assignment('--flag')).toBeUndefined();
  });
});
