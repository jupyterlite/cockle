import { shell_setup_simple } from "../shell_setup"
import { FileInput, Input, SingleCharInput } from "../../src/io"

describe("FileInput", () => {
  it("should read from file", async () => {
    const { fileSystem } = await shell_setup_simple()
    const fileInput = new FileInput(fileSystem, "file2")
    const read = fileInput.read()
    expect(read).toEqual("Some other file\nSecond line")
  })
})

describe("SingleCharInput", () => {
  it("should read from file a character at a time", async () => {
    const { fileSystem } = await shell_setup_simple()
    const fileInput = new SingleCharInput(new FileInput(fileSystem, "file2"))
    const expected = "Some other file\nSecond line"
    for (let i = 0; i < expected.length; i++) {
      const charCode = fileInput.readCharCode()
      expect(charCode).toEqual(expected.charCodeAt(i))
    }
    for (let i = 0; i < 3; i++) {
      const charCode = fileInput.readCharCode()
      // Once end of input file reached, always returns char code 4 (EOT).
      expect(charCode).toEqual(4)
    }
  })
})
