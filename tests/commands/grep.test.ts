import { shell_setup_simple } from "../shell_setup"

describe("grep command", () => {
  it("should write to stdout", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("grep cond file2")
    expect(output.text).toEqual("Second line\r\n")
  })

  it("should support ^ and $", async () => {
    const { shell, output, FS } = await shell_setup_simple()
    const line0 = " hello"
    const line1 = "hello "
    FS.writeFile("file3", line0 + "\n" + line1)

    await shell._runCommands("grep hello file3")
    expect(output.text).toEqual(line0 + "\r\n" + line1 + "\r\n")
    output.clear()

    await shell._runCommands("grep ^hello file3")
    expect(output.text).toEqual(line1 + "\r\n")
    output.clear()

    await shell._runCommands("grep hello$ file3")
    expect(output.text).toEqual(line0 + "\r\n")
  })
})
