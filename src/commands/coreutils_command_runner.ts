import * as CoreutilsModule from "../wasm/coreutils"
import { WasmCommandRunner } from "./wasm_command_runner"

export class CoreutilsCommandRunner extends WasmCommandRunner {
  names(): string[] {
    return [
      // File commands
      "cp", "echo", "env", "ln", "ls", "mkdir", "mv", "pwd", "realpath", "rm", "rmdir", "touch",
      "uname",
      // Text commands
      "cat", "cut", "head", "join", "md5sum", "nl", "sha1sum", "sha224sum", "sha256sum",
      "sha384sum", "sha512sum", "sort", "tail", "tr", "wc",
      // Shell commands
      "basename", "date", "dirname", "echo", "env", "expr", "id", "logname", "pwd", "seq", "sleep",
      "stat", "uname",
    ]
  }

  protected _getWasmModule(): any {
    return CoreutilsModule.default
  }
}
