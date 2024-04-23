import { ContentsManagerMock } from "@jupyterlab/services/lib/testutils"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { IFileSystem } from "../../src"
import { JupyterFileSystem } from "../../src/jupyter_file_system"
import { NodeFileSystem } from "../../src/node_file_system"

import { CommandRegistry } from "../../src/command_registry"
import { Context } from "../../src/context"
import { ConsoleOutput } from "../../src/io/console_output"

async function setup(name: string): Promise<IFileSystem> {
  if (name == "jupyter") {
    const cm = new ContentsManagerMock()
    await cm.save("file1")
    await cm.save("file2")
    await cm.save("dirA", { type: "directory" })
    return new JupyterFileSystem(cm)
  } else {
    const baseDir = await fs.mkdtemp(tmpdir())
    await fs.writeFile(join(baseDir, "file1"), "")
    await fs.writeFile(join(baseDir, "file2"), "")
    await fs.mkdir(join(baseDir, "dirA"))
    return new NodeFileSystem(baseDir)
  }
}

describe("ls command", () => {
  it.each(["jupyter", "node"])
  ('should write to console %s', async (name) => {
    const fs = await setup(name)
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
