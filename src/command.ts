import { Context } from "./context"
import { Options } from "./options"

export abstract class Command<T extends Options = Options>  {
  // Return is exit code
  abstract run(context: Context): Promise<number>
}
