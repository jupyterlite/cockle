import { Command } from "../command"
import { Context } from "../context"

export class EnvCommand extends Command {
  override async run(context: Context): Promise<number> {
    // Ignore args
    for (let [key, value] of context.env.entries()) {
      const line = `${key}=${value}\r\n`
      await context.stdout.write(line)
    }
    return 0
  }
}
