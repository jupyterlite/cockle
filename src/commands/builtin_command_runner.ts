import { ICommandRunner } from "./command_runner"
import { Context } from "../context"

export class BuiltinCommandRunner implements ICommandRunner {
  names(): string[] {
    return ["cd"]
  }

  async run(cmdName: string, context: Context): Promise<void> {
    switch (cmdName) {
      case "cd":
        this._cd(context)
        break
    }
  }

  private _cd(context: Context) {
    const { args } = context
    if (args.length < 1) {
      // Do nothing.
      return;
    }
    const path = args[0]  // Ignore other arguments?
    // Need to handle path of "-". Maybe previous path is in an env var?  "OLDPWD"

    const { FS } = context.fileSystem
    FS.chdir(path)
    context.environment.set("PWD", FS.cwd())
  }
}
