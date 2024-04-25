import { file_system_setup } from "../file_system_setup"

import { CommandRegistry } from "../../src/command_registry"
import { Context } from "../../src/context"
import { ConsoleOutput } from "../../src/io/console_output"

describe("ls command", () => {
  it.each(["jupyter", "node"])
  ('should write to console %s', async (name) => {
    const fs = await file_system_setup(name)
    const stdout = new ConsoleOutput()
    const context = new Context(["/"], fs, stdout)

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const cmd = CommandRegistry.instance().create("ls")
    expect(cmd).not.toBeNull()
    const exit_code = await cmd!.run(context)
    expect(exit_code).toBe(0)

    expect(spy).toHaveBeenCalledWith("dirA  file1  file2");
    spy.mockRestore();
  })
})
