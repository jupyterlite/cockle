import { shell_setup_simple } from "../shell_setup"

describe("cd command", () => {
  it("should do nothing if no arguments", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("cd")
    expect(output.text).toEqual("")
  })

  it("should error if more than one argument", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("cd a b")
    expect(output.text).toMatch(/cd: too many arguments/)
  })

  it("should change directory", async () => {
    const { shell, output } = await shell_setup_simple()

    await shell._runCommands("pwd")
    expect(output.text).toEqual("/drive\r\n")
    output.clear()

    await shell._runCommands("cd dirA")
    await shell._runCommands("pwd")
    expect(output.text).toEqual("/drive/dirA\r\n")
  })

  it("should update PWD", async () => {
    const { shell } = await shell_setup_simple()
    const { environment } = shell

    expect(environment.get("PWD")).toEqual("/drive")
    await shell._runCommands("cd dirA")
    expect(environment.get("PWD")).toEqual("/drive/dirA")
  })

  it("should support cd -", async () => {
    const { shell } = await shell_setup_simple()
    const { environment } = shell

    expect(environment.get("OLDPWD")).toBeNull()
    await shell._runCommands("cd dirA")
    expect(environment.get("PWD")).toEqual("/drive/dirA")
    expect(environment.get("OLDPWD")).toEqual("/drive")
    await shell._runCommands("cd -")
    expect(environment.get("PWD")).toEqual("/drive")
    expect(environment.get("OLDPWD")).toEqual("/drive/dirA")
  })

  it("should error if use cd - and OLDPWD not set", async () => {
    const { shell, output } = await shell_setup_simple()
    await shell._runCommands("cd -")
    expect(output.text).toMatch(/cd: OLDPWD not set/)
  })
})
