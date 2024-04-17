import { tokenize } from "../src";

describe("Tokenize offsets", () => {
  it('should support no tokens', () => {
    expect(tokenize("")).toStrictEqual([])
    expect(tokenize(" ")).toStrictEqual([])
    expect(tokenize("  ")).toStrictEqual([])
  })

  it('should support single token', () => {
    expect(tokenize("l")).toStrictEqual([0, 1])
    expect(tokenize(";")).toStrictEqual([0, 1])
    expect(tokenize("ls")).toStrictEqual([0, 2])
    expect(tokenize("grep")).toStrictEqual([0, 4])
  })

  it('should support multiple tokens', () => {
    expect(tokenize("ls -al; pwd")).toStrictEqual([0, 2, 3, 6, 6, 7, 8, 11])
    expect(tokenize("ls -al& pwd")).toStrictEqual([0, 2, 3, 6, 6, 7, 8, 11])
  })

  it('should ignore leading and trailing whitespace', () => {
    expect(tokenize("  ls")).toStrictEqual([2, 4])
    expect(tokenize("ls  ")).toStrictEqual([0, 2])
    expect(tokenize(" ls   ")).toStrictEqual([1, 3])
  })
})
