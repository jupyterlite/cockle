import { CommandNode, parse } from "../src/parse"

describe("parse", () => {
  it("should support no commands", () => {
    expect(parse("")).toEqual([])
    expect(parse(";")).toEqual([])
    expect(parse(" ;  ; ")).toEqual([])
  })

  it("should support single command", () => {
    expect(parse("ls")).toEqual([
      new CommandNode({offset: 0, value: "ls"}, []),
    ])
    expect(parse("ls -al")).toEqual([
      new CommandNode({offset: 0, value: "ls"}, [{offset: 3, value: "-al"}]),
    ])
    expect(parse("ls -al;")).toEqual([
      new CommandNode({offset: 0, value: "ls"}, [{offset: 3, value: "-al"}]),
    ])
  })

  it("should support multiple commands", () => {
    expect(parse("ls -al;pwd")).toEqual([
      new CommandNode({offset: 0, value: "ls"}, [{offset: 3, value: "-al"}]),
      new CommandNode({offset: 7, value: "pwd"}, []),
    ])
    expect(parse("echo abc;pwd;ls -al")).toEqual([
      new CommandNode({offset: 0, value: "echo"}, [{offset: 5, value: "abc"}]),
      new CommandNode({offset: 9, value: "pwd"}, []),
      new CommandNode({offset: 13, value: "ls"}, [{offset: 16, value: "-al"}]),
    ])
  })
})
