import { Command } from "../command"
import { Context } from "../context"

export class PwdCommand extends Command {
  override async run(context: Context): Promise<number> {
    context.stdout.write(context.pwd() + "\r\n")
    return 0
  }
}
