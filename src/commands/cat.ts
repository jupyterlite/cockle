import { Command } from "../command"
import { Context } from "../context"

export class CatCommand extends Command {
  override async run(context: Context): Promise<number> {

    // Only supporting single path and no flags so far.
    if (context.args.length != 1) {
      // Write error message to stderr
      return 1
    }

    const path = context.args[0]
    const content = await context.filesystem.get(path)
    await context.stdout.write(content)
    return 0
  }
}
