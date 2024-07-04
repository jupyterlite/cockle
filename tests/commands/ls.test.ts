import { shell_setup_empty, shell_setup_simple } from "../shell_setup"

describe("ls command", () => {
  it("should write to stdout", async () => {
    const [shell, output] = await shell_setup_simple()
    await shell._runCommands("ls")
    expect(output.text).toEqual("dirA  file1  file2\r\n")

    output.clear()
    await shell._runCommands("ls -a")
    expect(output.text).toEqual(".  ..  dirA  file1  file2\r\n")
  })

  it("should handle empty listing", async () => {
    const [shell, output] = await shell_setup_empty()
    await shell._runCommands("ls")
    expect(output.text).toEqual("")
  })
})
