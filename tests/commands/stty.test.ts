import { shell_setup_empty } from "../shell_setup"

describe("stty command", () => {
  it("should return default size", async () => {
    const { shell, output } = await shell_setup_empty()

    await shell._runCommands("stty size")
    expect(output.text).toEqual("24 80\r\n")
    output.clear()

    await shell.setSize(10, 43)
    await shell._runCommands("stty size")
    expect(output.text).toEqual("10 43\r\n")
  })
})
