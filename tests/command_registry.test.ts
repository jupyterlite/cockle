import { CommandRegistry } from "../src/command_registry"

describe("CommandRegistry", () => {
  it("should store commands", () => {
    const registry = CommandRegistry.instance()
    expect(registry.get("cat")).not.toBeNull()
    expect(registry.get("echo")).not.toBeNull()
    expect(registry.get("env")).not.toBeNull()
    expect(registry.get("ls")).not.toBeNull()
    expect(registry.get("unknown")).toBeNull()
  })

  describe("match", () => {
    it("should match command names", () => {
      const registry = CommandRegistry.instance()
      expect(registry.match("unkn")).toEqual([])
      expect(registry.match("ec")).toEqual(["echo"])
      expect(registry.match("e")).toEqual(["echo", "env"])
    })
  })
})
