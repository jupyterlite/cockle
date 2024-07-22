import { shell_setup_simple } from "../shell_setup"

describe("lua command", () => {
  it("should write to stdout", async () => {
    const { shell, output } = await shell_setup_simple()
    const code = "print('Hello, world!')"
    await shell._runCommands(`lua -e ${code}`)
    console.log(output.text)
  })
})
