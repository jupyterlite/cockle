import { parse, tokenize, ParseError } from "../src"
import { AST } from "../src/parse"

describe("parse", () => {
  it("should return command offsets", () => {
    expect(parse("").commandOffsets).toStrictEqual([])
    expect(parse("ls").commandOffsets).toStrictEqual([0, 1])
    expect(parse("ls -al").commandOffsets).toStrictEqual([0, 2])
    expect(parse("ls -al;").commandOffsets).toStrictEqual([0, 2])
    expect(parse("ls -al;pwd").commandOffsets).toStrictEqual([0, 2, 3, 4])
    expect(parse("ls -al; pwd").commandOffsets).toStrictEqual([0, 2, 3, 4])
  })

  it("should return commands", () => {
    expect(parse("ls").commands).toEqual([["ls"]])
    expect(parse("ls -l -a").commands).toEqual([["ls", "-l", "-a"]])
    expect(parse("ls -l -a; pwd").commands).toEqual([["ls", "-l", "-a"], ["pwd"]])
  })

  it("should raise on invalid index bounds", () => {
    const ast = parse("ls -al")
    expect(() => ast.command(-1)).toThrow(RangeError)
    expect(() => ast.command(2)).toThrow(RangeError)
  })
})

describe("AST validate", () => {
  const tokenizedSource = tokenize("ls -al; pwd")

  it("should raise if odd number of offsets", () => {
    expect(() => new AST(tokenizedSource, [0])).toThrow(ParseError)
  })

  it("should raise if offset end not greater than start", () => {
    expect(() => new AST(tokenizedSource, [0, 0])).toThrow(ParseError)
  })

  it("should raise if tokens overlap", () => {
    expect(() => new AST(tokenizedSource, [0, 2, 1, 3])).toThrow(ParseError)
  })

  it("should raise if offsets out of bounds", () => {
    expect(() => new AST(tokenizedSource, [3, 5])).toThrow(ParseError)
    expect(() => new AST(tokenizedSource, [-1, 1])).toThrow(ParseError)
  })
})
