import { Command } from "./command"
import * as AllCommands from "./commands"

export class CommandRegistry {
  private constructor() {}

  /**
   * Create a new Command identified by its string name.
   */
  create(name: string): Command | null {
    const cls = this.get(name)
    if (cls) {
      return new (cls as any)()
    } else {
      return null
    }
  }

  get(name: string): typeof Command | null {
    return this._map.get(name) ?? null
  }

  static instance()  {
    if (!CommandRegistry._instance) {
      CommandRegistry._instance = new CommandRegistry()
    }
    return CommandRegistry._instance
  }

  register(name: string, cls: typeof Command) {
    if (name.endsWith("Command")) {
      const shortName = name.slice(0, -7).toLowerCase()
      this._map.set(shortName, cls)
    }
  }

  private static _instance: CommandRegistry
  private _map: Map<string, typeof Command> = new Map()
}

function registerCommands(commands: {[key: string]: typeof Command}) {
  const registry = CommandRegistry.instance()
  for (const [key, value] of Object.entries(commands)) {
    registry.register(key, value)
  }
}

registerCommands(AllCommands)
