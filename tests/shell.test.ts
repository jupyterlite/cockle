import { shell_setup_empty, shell_setup_simple } from "./shell_setup"
import { MockTerminalStdin } from "./util"

describe("Shell", () => {
  describe("._runCommands", () => {
    it("should run ls command", async () => {
      const { shell, output } = await shell_setup_simple()
      await shell._runCommands("ls")
      expect(output.text).toEqual("dirA  file1  file2\r\n")
    })

    it("should run ls command with leading whitespace", async () => {
      const { shell, output } = await shell_setup_simple()
      await shell._runCommands("   ls")
      expect(output.text).toEqual("dirA  file1  file2\r\n")
    })

    it("should output redirect to file", async () => {
      const { shell, output, FS } = await shell_setup_simple()
      await shell._runCommands("echo Hello > out")
      expect(output.text).toEqual("")
      expect(FS.readFile("out", { "encoding": "utf8" })).toEqual("Hello\n")

      await shell._runCommands("echo Goodbye >> out")
      expect(output.text).toEqual("")
      expect(FS.readFile("out", { "encoding": "utf8" })).toEqual("Hello\nGoodbye\n")
    })

    it("should input redirect from file", async () => {
      const { shell, output } = await shell_setup_simple()
      await shell._runCommands("wc < file2")
      expect(output.text).toEqual("      1       5      27\r\n")
    })

    it("should support pipe", async () => {
      const { shell, output } = await shell_setup_simple()
      await shell._runCommands("ls -1|sort -r")
      expect(output.text).toEqual("file2\r\nfile1\r\ndirA\r\n")
      output.clear()

      await shell._runCommands("ls -1|sort -r|uniq -c")
      expect(output.text).toEqual("      1 file2\r\n      1 file1\r\n      1 dirA\r\n")
    })

    it("should support terminal stdin", async () => {
      const mockStdin = new MockTerminalStdin()
      const { shell, output } = await shell_setup_empty({
        stdinCallback: mockStdin.stdinCallback.bind(mockStdin),
        enableBufferedStdinCallback: mockStdin.enableBufferedStdinCallback.bind(mockStdin),
      })
      await shell._runCommands("wc")
      expect(output.text).toEqual("      0       2       5\r\n")
      expect(mockStdin.callCount).toEqual(6)
      expect(mockStdin.enableCallCount).toEqual(1)
      expect(mockStdin.disableCallCount).toEqual(1)
    })
  })

  describe("input", () => {
    it("should echo input up to \\r", async () => {
      const { shell, output } = await shell_setup_simple()
      await shell.inputs(["l", "s", " ", "-", "a", "l"])
      expect(output.text).toEqual("ls -al")
    })

    it("should echo input and run ls command after \\r", async () => {
      const { shell, output } = await shell_setup_simple()
      await shell.inputs(["l", "s", "\r"])
      expect(output.text).toMatch(/^ls\r\ndirA  file1  file2\r\n/)
    })
  })

  describe("input tab complete", () => {
    it("should complete ec", async () => {
      const { shell, output } = await shell_setup_empty()
      await shell.inputs(["e", "c", "\t"])
      expect(output.text).toEqual("echo ")
    })

    it("should ignore leading whitespace", async () => {
      const { shell, output } = await shell_setup_empty()
      await shell.inputs([" ", "e", "c", "\t"])
      expect(output.text).toEqual(" echo ")
    })

    it("should ignore leading whitespace x2", async () => {
      const { shell, output } = await shell_setup_empty()
      await shell.inputs([" ", " ", "e", "c", "\t"])
      expect(output.text).toEqual("  echo ")
    })

    it("should show tab completion options", async () => {
      const { shell, output } = await shell_setup_empty()
      await shell.inputs(["e", "\t"])
      expect(output.text).toMatch(/^e\r\necho  env  expr\r\n/)
    })

    it("should do nothing on unknown command", async () => {
      const { shell, output } = await shell_setup_empty()
      await shell.inputs(["u", "n", "k", "\t"])
      expect(output.text).toEqual("unk")
    })

    it("should include aliases", async () => {
      const { shell, output } = await shell_setup_empty()
      await shell.inputs(["l", "\t"])
      expect(output.text).toMatch(/^l\r\nln  logname  ls  ll/)
    })
  })

  describe("setSize", () => {
    it("should set env vars", async () => {
      const { shell } = await shell_setup_empty()
      const { environment } = shell

      await shell.setSize(10, 44)
      expect(environment.getNumber("LINES")).toEqual(10)
      expect(environment.getNumber("COLUMNS")).toEqual(44)

      await shell.setSize(0, 45)
      expect(environment.getNumber("LINES")).toBeNull()
      expect(environment.getNumber("COLUMNS")).toEqual(45)

      await shell.setSize(14, -1)
      expect(environment.getNumber("LINES")).toEqual(14)
      expect(environment.getNumber("COLUMNS")).toBeNull()
    })
  })
})
