import { shell_setup_empty } from "../shell_setup"

describe("echo command", () => {
  it("should write to stdout", async () => {
    const { shell, output } = await shell_setup_empty()
    await shell._runCommands("echo some text")
    expect(output.text).toEqual("some text\r\n")
  })
})
