import { shell_setup_empty } from "./shell_setup"

// Not accessing the history object directly, here using the Shell.

describe("history", () => {
  it("should be stored", async () => {
    const { shell, output } = await shell_setup_empty()

    await shell._runCommands("cat")
    await shell._runCommands("echo")
    await shell._runCommands("ls")
    output.clear()

    await shell._runCommands("history")
    expect(output.text).toEqual("    0  cat\r\n    1  echo\r\n    2  ls\r\n    3  history\r\n")
  })

  it("should limit storage to max size", async () => {
    // TODO: Max size initially hard-coded as 5, will change to use env var.
    const { shell, output } = await shell_setup_empty()

    await shell._runCommands("cat")
    await shell._runCommands("echo")
    await shell._runCommands("ls")
    await shell._runCommands("uname")
    await shell._runCommands("uniq")
    output.clear()

    await shell._runCommands("history")
    expect(output.text).toEqual(
        "    0  echo\r\n    1  ls\r\n    2  uname\r\n    3  uniq\r\n    4  history\r\n")
  })

  it("should rerun previous command using !index syntax", async () => {
    const { shell, output } = await shell_setup_empty()

    await shell._runCommands("cat")
    await shell._runCommands("echo hello")
    await shell._runCommands("ls")
    output.clear()

    await shell._runCommands("!1")
    expect(output.text).toEqual("hello\r\n")
  })

  // Need ! out of bounds

  // Need up and down to be tested.
})
