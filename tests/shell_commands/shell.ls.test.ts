import { ContentsManagerMock } from "@jupyterlab/services/lib/testutils"

import { MockTerminalOutput } from "../util"

import { JupyterFileSystem } from "../../src/jupyter_file_system"
import { Shell } from "../../src/shell"

export async function file_system_many_files(filenames: string[]): Promise<JupyterFileSystem> {
  const cm = new ContentsManagerMock()
  for (const filename of filenames) {
    await cm.save(filename)
  }
  return new JupyterFileSystem(cm)
}

describe("Shell", () => {
  describe("._runCommands", () => {
    it("should run ls command", async () => {
      const filenames = [
        "a", "bb", "ccc", "dd", "eeeeeeeee", "f", "gg", "h", "iii", "j", "kkkkk",
      ]
      const rows2 =
        "a   ccc  eeeeeeeee  gg  iii  kkkkk\r\n" +
        "bb  dd   f          h   j\r\n"
      const rows3 =
        "a    dd         gg   j\r\n" +
        "bb   eeeeeeeee  h    kkkkk\r\n" +
        "ccc  f          iii\r\n"
      const rows4 =
        "a    eeeeeeeee  iii\r\n" +
        "bb   f          j\r\n" +
        "ccc  gg         kkkkk\r\n" +
        "dd   h\r\n"

      const fs = await file_system_many_files(filenames)
      const output = new MockTerminalOutput()
      const shell = new Shell(fs, output.callback)

      await shell._runCommands("ls")
      expect(output.text).toEqual(filenames.join("\r\n") + "\r\n")
      output.clear()

      await shell.setSize(100, 45)
      await shell._runCommands("ls")
      expect(output.text).toEqual(rows2)
      output.clear()

      await shell.setSize(100, 28)
      await shell._runCommands("ls")
      expect(output.text).toEqual(rows3)
      output.clear()

      await shell.setSize(100, 23)
      await shell._runCommands("ls")
      expect(output.text).toEqual(rows4)
      output.clear()
    })
  })
})
