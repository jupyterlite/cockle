import { Command } from "../command"
import { Context } from "../context"

export class RmCommand extends Command {
  override async run(context: Context): Promise<number> {
    const args = context.args

    // Validate and expand arguments (flags and file/directory names).
    // Only supporting single path and no flags so far.
    if (args.length > 1) {
      // Write error message to stderr
      return 1
    }

    const path = args[0]  // If a relative path need to add PWD
    await context.filesystem.delete(path)
    return 0
  }
}
