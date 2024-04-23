import { Context } from "./context"

export abstract class Command {
  // Return is exit code
  abstract run(context: Context): Promise<number>
}
