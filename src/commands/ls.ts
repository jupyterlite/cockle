import { Command } from "../command"
import { Context } from "../context"
import { BooleanOption } from "../option"
import { Options } from "../options"

class LsOptions extends Options {
  commaSeparated = new BooleanOption("m", "", "List files across the page, separated by commas.")
  long = new BooleanOption("l", "", "List files in long format.")
  reverse = new BooleanOption("r", "", "Reverse the order of the sort.")
}

export class LsCommand extends Command<LsOptions> {
  override async run(context: Context): Promise<number> {
    const args = context.args
    const options = Options.fromArgs(args, LsOptions)

    // Can use lines like this for options.
    if (options.reverse.isSet) {

    }

    // Validate and expand arguments (flags and file/directory names).
    // Only supporting single path and no flags so far.
    if (args.length > 1) {
      // Write error message to stderr
      return 1
    }

    const path = args.length == 0 ? (context.env.get("PWD") ?? "/"): args[0]
    const filenames = await context.filesystem.list(path)
    await context.stdout.write(filenames.join("  ") + "\r\n")  // How to deal with newlines?
    return 0
  }
}
