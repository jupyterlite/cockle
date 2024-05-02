import { Command } from "../command"
import { Context } from "../context"

export class EchoCommand extends Command {
  override async run(context: Context): Promise<number> {

    // Expecting single argument only.
    if (context.args.length != 1) {
      // Write error message to stderr
      return 1
    }

    await context.stdout.write(context.args[0] + "\r\n")
    return 0
  }
}
