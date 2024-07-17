import { Aliases, tokenize } from "../src"

describe("Tokenize", () => {
  it("should support no tokens", () => {
    expect(tokenize("")).toEqual([])
    expect(tokenize(" ")).toEqual([])
    expect(tokenize("  ")).toEqual([])
  })

  it("should support single token", () => {
    expect(tokenize("pwd")).toEqual([{offset: 0, value: "pwd"}])
    expect(tokenize("grep")).toEqual([{offset: 0, value: "grep"}])
  })

  it("should support single token ignoring whitespace", () => {
    expect(tokenize(" ")).toEqual([])
    expect(tokenize("ls  ")).toEqual([{offset: 0, value: "ls"}])
    expect(tokenize("  ls")).toEqual([{offset: 2, value: "ls"}])
    expect(tokenize(" ls   ")).toEqual([{offset: 1, value: "ls"}])
  })

  it("should support multiple tokens", () => {
    expect(tokenize("ls -al; pwd")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "-al"}, {offset: 6, value: ";"},
      {offset: 8, value: "pwd"},
    ])
  })

  it("should support delimiters with and without whitespace", () => {
    expect(tokenize("ls;")).toEqual([{offset: 0, value: "ls"}, {offset: 2, value: ";"}])
    expect(tokenize(";ls")).toEqual([{offset: 0, value: ";"}, {offset: 1, value: "ls"}])
    expect(tokenize(";ls;;")).toEqual([
      {offset: 0, value: ";"}, {offset: 1, value: "ls"}, {offset: 3, value: ";;"},
    ])
    expect(tokenize("ls ; ; pwd")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: ";"}, {offset: 5, value: ";"},
      {offset: 7, value: "pwd"},
    ])
    expect(tokenize("ls ;; pwd")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: ";;"}, {offset: 6, value: "pwd"},
    ])
    expect(tokenize("ls;pwd")).toEqual([
      {offset: 0, value: "ls"}, {offset: 2, value: ";"}, {offset: 3, value: "pwd"},
    ])
    expect(tokenize("ls;;pwd")).toEqual([
      {offset: 0, value: "ls"}, {offset: 2, value: ";;"}, {offset: 4, value: "pwd"},
    ])
    expect(tokenize(" ;; ")).toEqual([{offset: 1, value: ";;"}])
    expect(tokenize(" ; ; ")).toEqual([{offset: 1, value: ";"}, {offset: 3, value: ";"}])
  })

  it("should support pipe", () => {
    expect(tokenize("ls -l | sort")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "-l"}, {offset: 6, value: "|"},
      {offset: 8, value: "sort"},
    ])
    expect(tokenize("ls -l|sort")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "-l"}, {offset: 5, value: "|"},
      {offset: 6, value: "sort"},
    ])
  })

  it("should support redirection of stdout", () => {
    expect(tokenize("ls -l > somefile")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "-l"}, {offset: 6, value: ">"},
      {offset: 8, value: "somefile"},
    ])
    expect(tokenize("ls -l>somefile")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "-l"}, {offset: 5, value: ">"},
      {offset: 6, value: "somefile"},
    ])
    expect(tokenize("ls >> somefile")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: ">>"}, {offset: 6, value: "somefile"},
    ])
    expect(tokenize("ls>>somefile")).toEqual([
      {offset: 0, value: "ls"}, {offset: 2, value: ">>"}, {offset: 4, value: "somefile"},
    ])
    expect(tokenize("ls >>somefile")).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: ">>"}, {offset: 5, value: "somefile"},
    ])
    expect(tokenize("ls>> somefile")).toEqual([
      {offset: 0, value: "ls"}, {offset: 2, value: ">>"}, {offset: 5, value: "somefile"},
    ])
  })

  it("should support redirection of stdin", () => {
    expect(tokenize("wc -l < somefile")).toEqual([
      {offset: 0, value: "wc"}, {offset: 3, value: "-l"}, {offset: 6, value: "<"},
      {offset: 8, value: "somefile"},
    ])
  })

  it("should use aliases", () => {
    const aliases = new Aliases()
    expect(tokenize("ll", aliases)).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "--color=auto"},
    ])
    expect(tokenize("ll;", aliases)).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "--color=auto"}, {offset: 15, value: ";"},
    ])
    expect(tokenize(" ll ", aliases)).toEqual([
      {offset: 1, value: "ls"}, {offset: 4, value: "--color=auto"},
    ])
    expect(tokenize("cat; ll", aliases)).toEqual([
      {offset: 0, value: "cat"}, {offset: 3, value: ";"}, {offset: 5, value: "ls"},
      {offset: 8, value: "--color=auto"}
    ])
    expect(tokenize("ll; cat", aliases)).toEqual([
      {offset: 0, value: "ls"}, {offset: 3, value: "--color=auto"}, {offset: 15, value: ";"},
      {offset: 17, value: "cat"},
    ])
  })
})
