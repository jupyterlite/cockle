import { tokenize, TokenizeError } from "../src"
import { TokenizedSource } from "../src/tokenize"

describe("Tokenize offsets", () => {
  it("should support no tokens", () => {
    expect(tokenize("").offsets).toStrictEqual([])
    expect(tokenize(" ").offsets).toStrictEqual([])
    expect(tokenize("  ").offsets).toStrictEqual([])
  })

  it("should support single token", () => {
    expect(tokenize("l").offsets).toStrictEqual([0, 1])
    expect(tokenize(";").offsets).toStrictEqual([0, 1])
    expect(tokenize("ls").offsets).toStrictEqual([0, 2])
    expect(tokenize("grep").offsets).toStrictEqual([0, 4])
  })

  it("should support multiple tokens", () => {
    expect(tokenize("ls -al; pwd").offsets).toStrictEqual([0, 2, 3, 6, 6, 7, 8, 11])
    expect(tokenize("ls -al& pwd").offsets).toStrictEqual([0, 2, 3, 6, 6, 7, 8, 11])
  })

  it("should ignore leading and trailing whitespace", () => {
    expect(tokenize("  ls").offsets).toStrictEqual([2, 4])
    expect(tokenize("ls  ").offsets).toStrictEqual([0, 2])
    expect(tokenize(" ls   ").offsets).toStrictEqual([1, 3])
  })
})

describe("Tokenize token", () => {
  it("should return single token", () => {
    const tokenized_source = tokenize("ls -al; pwd")
    expect(tokenized_source.length).toEqual(4)
    expect(tokenized_source.token(0)).toEqual("ls")
    expect(tokenized_source.token(1)).toEqual("-al")
    expect(tokenized_source.token(2)).toEqual(";")
    expect(tokenized_source.token(3)).toEqual("pwd")
  })

  it("should raise on invalid index bounds", () => {
    const tokenized_source = tokenize("ls -al")
    expect(() => tokenized_source.token(-1)).toThrow(RangeError)
    expect(() => tokenized_source.token(2)).toThrow(RangeError)
  })
})

describe("Tokenize tokens", () => {
  it("should return all tokens", () => {
    expect(tokenize("ls -al; pwd").tokens).toEqual(["ls", "-al", ";", "pwd"])
  })
})

describe("Tokenize validate", () => {
  it("should raise if odd number of offsets", () => {
    expect(() => new TokenizedSource("", [0])).toThrow(TokenizeError)
  })

  it("should raise if offset end not greater than start", () => {
    expect(() => new TokenizedSource("", [0, 0])).toThrow(TokenizeError)
  })

  it("should raise if tokens overlap", () => {
    expect(() => new TokenizedSource("", [0, 2, 1, 3])).toThrow(TokenizeError)
  })

  it("should raise if tokens overlap", () => {
    expect(() => new TokenizedSource("l", [0, 2])).toThrow(TokenizeError)
    expect(() => new TokenizedSource("l", [-1, 1])).toThrow(TokenizeError)
  })
})
