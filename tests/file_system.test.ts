import { ContentsManagerMock } from "@jupyterlab/services/lib/testutils"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { IFileSystem } from "../src"
import { JupyterFileSystem } from "../src/jupyter_file_system"
import { NodeFileSystem } from "../src/node_file_system"

async function setup(name: string): Promise<[IFileSystem, string]> {
  if (name == "jupyter") {
    const cm = new ContentsManagerMock()
    await cm.save("file1")
    await cm.save("file2")
    await cm.save("dirA", { type: "directory" })
    return [new JupyterFileSystem(cm), ""]
  } else {
    const dir = await fs.mkdtemp(tmpdir())
    await fs.writeFile(join(dir, "file1"), "")
    await fs.writeFile(join(dir, "file2"), "")
    await fs.mkdir(join(dir, "dirA"))
    return [new NodeFileSystem(), dir]
  }
}

describe("IFileSystem", () => {
  it.each(["jupyter", "node"])
  ('.list %s', async (name) => {
    const [fs, dir] = await setup(name)
    const filenames = await fs.list(dir)
    expect(filenames).toEqual(["dirA", "file1", "file2"])
  })
})
