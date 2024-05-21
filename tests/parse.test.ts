import { CommandNode, parse } from "../src/parse"
import { Token } from "../src/tokenize"

describe("parse", () => {
  it("should support no commands", () => {
    expect(parse("")).toEqual([])
    expect(parse(";")).toEqual([])
    expect(parse(" ;  ; ")).toEqual([])
  })

  it("should support single command", () => {
    expect(parse("ls")).toEqual([
      new CommandNode(new Token(0, "ls"), []),
    ])
    expect(parse("ls -al")).toEqual([
      new CommandNode(new Token(0, "ls"), [new Token(3, "-al")]),
    ])
    expect(parse("ls -al;")).toEqual([
      new CommandNode(new Token(0, "ls"), [new Token(3, "-al")]),
    ])
  })

  it("should support multiple commands", () => {
    expect(parse("ls -al;pwd")).toEqual([
      new CommandNode(new Token(0, "ls"), [new Token(3, "-al")]),
      new CommandNode(new Token(7, "pwd"), []),
    ])
    expect(parse("echo abc;pwd;ls -al")).toEqual([
      new CommandNode(new Token(0, "echo"), [new Token(5, "abc")]),
      new CommandNode(new Token(9, "pwd"), []),
      new CommandNode(new Token(13, "ls"), [new Token(16, "-al")]),
    ])
  })
})
