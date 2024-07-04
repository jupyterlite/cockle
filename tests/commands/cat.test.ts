import { shell_setup_simple } from "../shell_setup"

describe("echo command", () => {
  it("should write to stdout", async () => {
    const [shell, output] = await shell_setup_simple()
    await shell._runCommands("cat file1")
    expect(output.text).toEqual("Contents of the file\r\n")
  })
})
