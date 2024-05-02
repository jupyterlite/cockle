import { file_system_setup } from "./file_system_setup"
import { MockTerminalOutput } from "./util"

import { Shell } from "../src/shell"

describe("Shell", () => {
  describe("._runCommands", () => {
    it("should run a single command", async () => {
      const fs = await file_system_setup("jupyter")
      const output = new MockTerminalOutput()
      const shell = new Shell(fs, output.callback)
      await shell._runCommands("ls")
      expect(output.text).toEqual("dirA  file1  file2\r\n")
    })
  })

  describe("input", () => {
    it("should echo input up to \\r", async () => {
      const fs = await file_system_setup("jupyter")
      const output = new MockTerminalOutput()
      const shell = new Shell(fs, output.callback)
      await shell.input("ls -al")
      expect(output.text).toEqual("ls -al")
    })

    it("should echo input and run command after \\r", async () => {
      const fs = await file_system_setup("jupyter")
      const output = new MockTerminalOutput()
      const shell = new Shell(fs, output.callback)
      await shell.input("ls\r")
      expect(output.text).toEqual("ls\r\ndirA  file1  file2\r\n\x1b[1;31mjs-shell:$\x1b[1;0m ")
    })
  })
})
