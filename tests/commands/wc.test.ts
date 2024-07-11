import { shell_setup_simple } from "../shell_setup"

describe("wc command", () => {
  it("should read from single file as argument", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("wc file2")
    expect(output.text).toEqual(" 1  5 27 file2\r\n")
  })

  it("should read from multiple files as arguments", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("wc file1 file2")
    expect(output.text).toEqual(" 0  4 20 file1\r\n 1  5 27 file2\r\n 1  9 47 total\r\n")
  })

  it("should read single file from stdin", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("wc < file2")
    expect(output.text).toEqual("      1       5      27\r\n")
  })
})
