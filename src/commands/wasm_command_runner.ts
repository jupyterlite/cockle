import { ICommandRunner } from "./command_runner"
import { Context } from "../context"
import { SingleCharInput } from "../io"

export abstract class WasmCommandRunner implements ICommandRunner {
  abstract names(): string[]

  async run(cmdName: string, context: Context): Promise<void> {
    const { args, fileSystem, mountpoint, stdout} = context

    const start = Date.now()
    if (!this._wasmModule) {
      this._wasmModule = this._getWasmModule()
    }

    const stdin = new SingleCharInput(context.stdin)

    const wasm = await this._wasmModule({
      thisProgram: cmdName,
      noInitialRun: true,
      print: (text: string) => stdout.write(`${text}\n`),
      printErr: (text: string) => stdout.write(`${text}\n`),  // Should be stderr
      preRun: (module: any) => {
        // Use PROXYFS so that command sees the shared FS.
        const FS = module.FS
        FS.mkdir(mountpoint, 0o777)
        FS.mount(fileSystem.PROXYFS, { root: mountpoint, fs: fileSystem.FS }, mountpoint)
        FS.chdir(fileSystem.FS.cwd())

        // Copy environment variables into command.
        context.environment.copyIntoCommand(module.ENV)
      },
      stdin: () => {
        const charCode = stdin.readCharCode()
        if (charCode === 4) {  // EOT
          return null
        } else {
          return charCode
        }
      },
    })
    const loaded = Date.now()

    wasm.callMain(args)

    const FS = wasm.FS
    FS.close(FS.streams[1])
    FS.close(FS.streams[2])

    // Copy environment variables back from command.
    context.environment.copyFromCommand(wasm.getEnvStrings())

    const end = Date.now()
    console.log(`${cmdName} load time ${loaded-start} ms, run time ${end-loaded} ms`)
  }

  protected abstract _getWasmModule(): any

  private _wasmModule: any
}
