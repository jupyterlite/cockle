import { shell_setup_simple } from "../shell_setup"

describe("cd command", () => {
  it("should update PWD", async () => {
    const { shell } = await shell_setup_simple()
    const { environment } = shell
    expect(environment.get("PWD")).toEqual("/drive")
    await shell._runCommands("cd dirA")
    expect(environment.get("PWD")).toEqual("/drive/dirA")
  })
})
