import { file_system_setup } from "../file_system_setup"

import { CommandRegistry } from "../../src/command_registry"
import { Context } from "../../src/context"
import { ConsoleOutput } from "../../src/io/console_output"

describe("ls command", () => {
  it.each(["jupyter"])
  ('should write dir to console %s', async (name) => {
    const fs = await file_system_setup(name)
    const stdout = new ConsoleOutput()
    const context = new Context(["/"], fs, stdout)

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const cmd = CommandRegistry.instance().create("ls")
    expect(cmd).not.toBeNull()
    const exit_code = await cmd!.run(context)
    expect(exit_code).toBe(0)

    expect(spy).toHaveBeenCalledWith("dirA\r\nfile1\r\nfile2\r\n")
    spy.mockRestore()
  })

  it.each(["jupyter"])
  ('should write file to console %s', async (name) => {
    const fs = await file_system_setup(name)
    const stdout = new ConsoleOutput()
    const context = new Context(["file2"], fs, stdout)

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const cmd = CommandRegistry.instance().create("ls")
    expect(cmd).not.toBeNull()
    const exit_code = await cmd!.run(context)
    expect(exit_code).toBe(0)

    expect(spy).toHaveBeenCalledWith("file2\r\n")
    spy.mockRestore()
  })
})
