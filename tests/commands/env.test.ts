import { shell_setup_simple } from "../shell_setup"

describe("env command", () => {
  it("should write to stdout", async () => {
    const { shell, output } = await shell_setup_simple()
    const { environment } = shell
    expect(environment.get("MYENV")).toBeNull()

    await shell._runCommands("env MYENV=23")
    expect(environment.get("MYENV")).toBeNull()
    expect(output.text.trim().split("\r\n").at(-1)).toEqual("MYENV=23")
  })
})
