import { Token, tokenize } from "../src"

describe("Tokenize", () => {
  it("should support no tokens", () => {
    expect(tokenize("")).toEqual([])
    expect(tokenize(" ")).toEqual([])
    expect(tokenize("  ")).toEqual([])
  })

  it("should support single token", () => {
    expect(tokenize("pwd")).toEqual([new Token(0, "pwd")])
    expect(tokenize("grep")).toEqual([new Token(0, "grep")])
  })

  it("should support single token ignoring whitespace", () => {
    expect(tokenize(" ")).toEqual([])
    expect(tokenize("ls  ")).toEqual([new Token(0, "ls")])
    expect(tokenize("  ls")).toEqual([new Token(2, "ls")])
    expect(tokenize(" ls   ")).toEqual([new Token(1, "ls")])
  })


  it("should support multiple tokens", () => {
    expect(tokenize("ls -al; pwd")).toEqual([
      new Token(0, "ls"), new Token(3, "-al"), new Token(6, ";"), new Token(8, "pwd"),
    ])
  })

  it("should support delimiters with and without whitespace", () => {
    expect(tokenize("ls;")).toEqual([new Token(0, "ls"), new Token(2, ";")])
    expect(tokenize(";ls")).toEqual([new Token(0, ";"), new Token(1, "ls")])
    expect(tokenize(";ls;;")).toEqual([
      new Token(0, ";"), new Token(1, "ls"), new Token(3, ";"), new Token(4, ";"),
    ])
    expect(tokenize("ls ; ; pwd")).toEqual([
      new Token(0, "ls"), new Token(3, ";"), new Token(5, ";"), new Token(7, "pwd"),
    ])
    expect(tokenize("ls ;; pwd")).toEqual([
      new Token(0, "ls"), new Token(3, ";"), new Token(4, ";"), new Token(6, "pwd"),
    ])
    expect(tokenize("ls;pwd")).toEqual([
      new Token(0, "ls"), new Token(2, ";"), new Token(3, "pwd"),
    ])
    expect(tokenize("ls;;pwd")).toEqual([
      new Token(0, "ls"), new Token(2, ";"), new Token(3, ";"), new Token(4, "pwd"),
    ])
    expect(tokenize(" ;; ")).toEqual([new Token(1, ";"), new Token(2, ";")])
    expect(tokenize(" ; ; ")).toEqual([new Token(1, ";"), new Token(3, ";")])
  })
})
