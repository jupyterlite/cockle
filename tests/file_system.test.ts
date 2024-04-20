import { ContentsManagerMock } from "@jupyterlab/services/lib/testutils"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { IFileSystem } from "../src"
import { JupyterFileSystem } from "../src/jupyter_file_system"
import { NodeFileSystem } from "../src/node_file_system"

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

describe("IFileSystem", () => {
  it.each(["jupyter", "node"])
  ('.list %s', async (name) => {
    const fs = await setup(name)
    const filenames = await fs.list("")
    expect(filenames).toEqual(["dirA", "file1", "file2"])
  })
})

describe("IFileSystem", () => {
  it.each(["jupyter", "node"])
  ('.touch %s', async (name) => {
    const fs = await setup(name)
    await fs.touch("newfile")
    const filenames = await fs.list("")
    expect(filenames).toEqual(["dirA", "file1", "file2", "newfile"])
  })
})

describe("IFileSystem", () => {
  it.each(["jupyter", "node"])
  ('.delete %s', async (name) => {
    const fs = await setup(name)
    await fs.delete("file1")
    const filenames = await fs.list("")
    expect(filenames).toEqual(["dirA", "file2"])
  })
})
