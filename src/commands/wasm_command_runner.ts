import { ICommandRunner } from "./command_runner"
import { Context } from "../context"

export abstract class WasmCommandRunner implements ICommandRunner {
  abstract names(): string[]

  async run(cmdName: string, context: Context): Promise<void> {
    const { args, fileSystem, mountpoint, stdin, stdout } = context

    const start = Date.now()
    if (!this._wasmModule) {
      this._wasmModule = this._getWasmModule()
    }

    const wasm = await this._wasmModule({
      thisProgram: cmdName,
      noInitialRun: true,
      print: (text: string) => stdout.write(`${text}\n`),
      printErr: (text: string) => stdout.write(`${text}\n`),  // Should be stderr
      preRun: (module: any) => {
        if (module.hasOwnProperty("FS")) {
          // Use PROXYFS so that command sees the shared FS.
          const FS = module.FS
          FS.mkdir(mountpoint, 0o777)
          FS.mount(fileSystem.PROXYFS, { root: mountpoint, fs: fileSystem.FS }, mountpoint)
          FS.chdir(fileSystem.FS.cwd())
        }

        if (module.hasOwnProperty("ENV")) {
          // Copy environment variables into command.
          context.environment.copyIntoCommand(module.ENV)
        }

        if (module.hasOwnProperty("TTY")) {
          // Monkey patch window size.
          function getWindowSize(tty: any): [number, number] {
            return [
              context.environment.getNumber("LINES") ?? 24,
              context.environment.getNumber("COLUMNS") ?? 80,
            ]
          }
          module.TTY.default_tty_ops.ioctl_tiocgwinsz = getWindowSize

          // Monkey patch stdin get_char.
          function getChar(tty: any) {
            const utf16codes = stdin.readChar()
            // What to do with length other than 1?
            const utf16 = utf16codes[0]
            if (utf16 === 4) {  // EOT
              return null
            } else {
              return utf16
            }
          }
          const stdinDeviceId = module.FS.makedev(5, 0)
          const stdinTty = module.TTY.ttys[stdinDeviceId]
          stdinTty.ops.get_char = getChar
        }
      },
    })
    const loaded = Date.now()

    if (!wasm.hasOwnProperty("callMain")) {
      throw new Error(`WASM module does not export 'callMain' so it cannot be called`)
    }

    wasm.callMain(args)

    if (wasm.hasOwnProperty("FS")) {
      const FS = wasm.FS
      FS.close(FS.streams[1])
      FS.close(FS.streams[2])
    }

    if (wasm.hasOwnProperty("getEnvStrings")) {
      // Copy environment variables back from command.
      context.environment.copyFromCommand(wasm.getEnvStrings())
    }

    const end = Date.now()
    console.log(`${cmdName} load time ${loaded-start} ms, run time ${end-loaded} ms`)
  }

  protected abstract _getWasmModule(): any

  private _wasmModule: any
}
