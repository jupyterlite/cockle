import { ICommand } from "./command"
import * as AllCommands from "./commands"

export class CommandRegistry {
  private static _instance: CommandRegistry
  private _map: Map<string, ICommand> = new Map()

  private constructor() {}

  get(name: string): ICommand | null {
    return this._map.get(name) ?? null
  }

  static instance()  {
    if (!CommandRegistry._instance) {
      CommandRegistry._instance = new CommandRegistry()
    }
    return CommandRegistry._instance
  }

  register(name: string, cls: ICommand) {
    if (name.endsWith("Command")) {
      const shortName = name.slice(0, -7).toLowerCase()
      this._map.set(shortName, cls)
    }
  }
}

function registerCommands(commands: {[key: string]: ICommand}) {
  const registry = CommandRegistry.instance()
  for (const [key, value] of Object.entries(commands)) {
    registry.register(key, value)
  }
}

registerCommands(AllCommands)
