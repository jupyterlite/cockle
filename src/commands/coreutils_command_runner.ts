import * as CoreutilsModule from "../wasm/coreutils"
import { WasmCommandRunner } from "./wasm_command_runner"

export class CoreutilsCommandRunner extends WasmCommandRunner {
  names(): string[] {
    return [
      "basename", "cat", "cp", "cut", "date", "dir", "dircolors", "dirname", "echo", "env", "expr",
      "head", "id", "join", "ln", "logname", "ls", "md5sum", "mkdir", "mv", "nl", "pwd", "realpath",
      "rm", "rmdir", "seq", "sha1sum", "sha224sum", "sha256sum", "sha384sum", "sha512sum", "sleep",
      "sort", "stat", "stty", "tail", "touch", "tr", "tty", "uname", "uniq", "vdir", "wc",
    ]
  }

  protected _getWasmModule(): any {
    return CoreutilsModule.default
  }
}
