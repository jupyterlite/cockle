import { shell_setup_empty } from "../shell_setup"

describe("alias command", () => {
  it("should write to stdout", async () => {
    const { shell, output } = await shell_setup_empty()

    await shell._runCommands("alias")
    expect(output.text).toEqual(
      "dir='dir --color=auto'\r\n" +
      "grep='grep --color=auto'\r\n" +
      "ls='ls --color=auto'\r\n" +
      "ll='ls -lF'\r\n" +
      "vdir='vdir --color=auto'\r\n"
    )
  })
})
