import { ContentsManagerMock } from "@jupyterlab/services/lib/testutils"
import { IFileSystem } from "../src"
import { JupyterFileSystem } from "../src/jupyter_file_system"

export async function file_system_setup(name: string): Promise<IFileSystem> {
  if (name == "jupyter") {
    const cm = new ContentsManagerMock()
    await cm.save("file1", {content: "Contents of file1"})
    await cm.save("file2")
    await cm.save("dirA", { type: "directory" })
    return new JupyterFileSystem(cm)
  } else {
    throw Error("No other IFileSystem-derived classes supported")
  }
}
