import { ContentsManagerMock } from "@jupyterlab/services/lib/testutils"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { IFileSystem } from "../src"
import { JupyterFileSystem } from "../src/jupyter_file_system"
import { NodeFileSystem } from "../src/node_file_system"

export async function file_system_setup(name: string): Promise<IFileSystem> {
  if (name == "jupyter") {
    const cm = new ContentsManagerMock()
    await cm.save("file1", {content: "Contents of file1"})
    await cm.save("file2")
    await cm.save("dirA", { type: "directory" })
    return new JupyterFileSystem(cm)
  } else {
    const baseDir = await fs.mkdtemp(tmpdir())
    await fs.writeFile(join(baseDir, "file1"), "Contents of file1")
    await fs.writeFile(join(baseDir, "file2"), "")
    await fs.mkdir(join(baseDir, "dirA"))
    return new NodeFileSystem(baseDir)
  }
}
