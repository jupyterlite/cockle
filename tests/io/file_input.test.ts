import { shell_setup_simple } from "../shell_setup"
import { FileInput } from "../../src/io"

describe("FileInput", () => {
  it("should read from file", async () => {
    const { fileSystem } = await shell_setup_simple()
    const fileInput = new FileInput(fileSystem, "file2")
    const read = fileInput.readAll()
    expect(read).toEqual("Some other file\nSecond line")
  })

  it("should read from file a character at a time", async () => {
    const { fileSystem } = await shell_setup_simple()
    const fileInput = new FileInput(fileSystem, "file2")
    const expected = "Some other file\nSecond line"
    for (let i = 0; i < expected.length; i++) {
      const charCodes = fileInput.readChar()
      expect(charCodes[0]).toEqual(expected.charCodeAt(i))
    }
    for (let i = 0; i < 3; i++) {
      const charCodes = fileInput.readChar()
      // Once end of input file reached, always returns char code 4 (EOT).
      expect(charCodes[0]).toEqual(4)
    }
  })
})
