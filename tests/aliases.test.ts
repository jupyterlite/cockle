import { shell_setup_empty } from "./shell_setup"

describe("aliases", () => {
  describe("get", () => {
    it("should return alias string", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.get("grep")).toEqual("grep --color=auto")
    })

    it("should return undefined for unknown key", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.get("unknown")).toBeUndefined()
    })
  })

  describe("getRecursive", () => {
    it("should returned undefined for unknown key", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.getRecursive("unknown")).toBeUndefined()
    })

    it("should lookup ls", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.getRecursive("ls")).toEqual("ls --color=auto")
    })

    it("should lookup ll", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.getRecursive("ll")).toEqual("ls --color=auto")
    })

    it("should lookup grep", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.getRecursive("grep")).toEqual("grep --color=auto")
    })
  })

  describe("match", () => {
    it("should match multiple possibilities", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.match("l")).toEqual(["ls", "ll"])
    })

    it("should match zero possibilities", async () => {
      const { shell } = await shell_setup_empty()
      const { aliases } = shell
      expect(aliases.match("z")).toEqual([])
    })
  })
})
