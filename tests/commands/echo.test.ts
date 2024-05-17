import { file_system_setup } from "../file_system_setup"

import { CommandRegistry } from "../../src/command_registry"
import { Context } from "../../src/context"
import { ConsoleOutput } from "../../src/io/console_output"

describe("echo command", () => {
  it.each(["jupyter"])
  ('should write to console %s', async (name) => {
    const fs = await file_system_setup(name)
    const stdout = new ConsoleOutput()
    const context = new Context(["some_text"], fs, stdout)

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const cmd = CommandRegistry.instance().create("echo")
    expect(cmd).not.toBeNull()
    const exit_code = await cmd!.run(context)
    expect(exit_code).toBe(0)

    expect(spy).toHaveBeenCalledWith("some_text\r\n")
    spy.mockRestore()
  })
})
