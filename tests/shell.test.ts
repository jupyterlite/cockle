import { shell_setup_empty, shell_setup_simple } from "./shell_setup"

describe("Shell", () => {
  describe("._runCommands", () => {
    it("should run ls command", async () => {
      const [shell, output] = await shell_setup_simple()
      await shell._runCommands("ls")
      expect(output.text).toEqual("dirA  file1  file2\r\n")
    })

    it("should run ls command with leading whitespace", async () => {
      const [shell, output] = await shell_setup_simple()
      await shell._runCommands("   ls")
      expect(output.text).toEqual("dirA  file1  file2\r\n")
    })
  })

  describe("input", () => {
    it("should echo input up to \\r", async () => {
      const [shell, output] = await shell_setup_simple()
      await shell.inputs(["l", "s", " ", "-", "a", "l"])
      expect(output.text).toEqual("ls -al")
    })

    it("should echo input and run ls command after \\r", async () => {
      const [shell, output] = await shell_setup_simple()
      await shell.inputs(["l", "s", "\r"])
      expect(output.text).toEqual("ls\r\ndirA  file1  file2\r\n\x1b[1;31mjs-shell:$\x1b[1;0m ")
    })
  })

  describe("input tab complete", () => {
    it("should complete ec", async () => {
      const [shell, output] = await shell_setup_empty()
      await shell.inputs(["e", "c", "\t"])
      expect(output.text).toEqual("echo ")
    })

    it("should ignore leading whitespace", async () => {
      const [shell, output] = await shell_setup_empty()
      await shell.inputs([" ", "e", "c", "\t"])
      expect(output.text).toEqual(" echo ")
    })

    it("should ignore leading whitespace x2", async () => {
      const [shell, output] = await shell_setup_empty()
      await shell.inputs([" ", " ", "e", "c", "\t"])
      expect(output.text).toEqual("  echo ")
    })

    it("should show tab completion options", async () => {
      const [shell, output] = await shell_setup_empty()
      await shell.inputs(["e", "\t"])
      expect(output.text).toEqual("e\r\necho  env  expr\r\n\x1b[1;31mjs-shell:$\x1b[1;0m e")
    })

    it("should do nothing on unknown command", async () => {
      const [shell, output] = await shell_setup_empty()
      await shell.inputs(["u", "n", "k", "\t"])
      expect(output.text).toEqual("unk")
    })
  })
})
