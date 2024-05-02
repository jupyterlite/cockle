import { Command } from "../command"
import { Context } from "../context"

export class LsCommand extends Command {
  override async run(context: Context): Promise<number> {
    const args = context.args

    // Validate and expand arguments (flags and file/directory names).
    // Only supporting single path and no flags so far.
    if (args.length > 1) {
      // Write error message to stderr
      return 1
    }

    const path = args.length == 0 ? "/" : args[0]  // Should be pwd really.
    const filenames = await context.filesystem.list(path)
    await context.stdout.write(filenames.join("  ") + "\r\n")  // How to deal with newlines?
    return 0
  }
}
