import { ICommandRunner } from "./command_runner"
import { Context } from "../context"

export abstract class WasmCommandRunner implements ICommandRunner {
  abstract names(): string[]

  async run(cmdName: string, context: Context): Promise<void> {
    const { args, fileSystem, mountpoint, stdout} = context

    const start = Date.now()
    if (!this._wasmModule) {
      this._wasmModule = this._getWasmModule()
    }

    const wasm = await this._wasmModule({
      thisProgram: cmdName,
      noInitialRun: true,
      print: (text: string) => stdout.write(`${text}\n`),
      printErr: (text: string) => stdout.write(`${text}\n`),  // Should be stderr
    })

    // Need to use PROXYFS so that command sees the shared FS.
    const FS = wasm.FS
    FS.mkdir(mountpoint, 0o777)
    FS.mount(fileSystem.PROXYFS, { root: mountpoint, fs: fileSystem.FS }, mountpoint)
    FS.chdir(fileSystem.FS.cwd())
    const loaded = Date.now()

    wasm.callMain(args)

    FS.close(FS.streams[1])
    FS.close(FS.streams[2])

    const end = Date.now()
    console.log(`${cmdName} load time ${loaded-start} ms, run time ${end-loaded} ms`)
  }

  protected abstract _getWasmModule(): any

  private _wasmModule: any
}
