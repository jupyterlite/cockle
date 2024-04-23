import { Command } from "../command"
import { Context } from "../context"

export class CatCommand extends Command {
  override async run(context: Context): Promise<number> {
    return 0
  }
}
