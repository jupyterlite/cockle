import { file_system_setup } from "./file_system_setup"

describe("IFileSystem", () => {
  it.each(["jupyter"])
  ('.list %s', async (name) => {
    const fs = await file_system_setup(name)
    const filenames = await fs.list("")
    expect(filenames).toEqual(["dirA", "file1", "file2"])
  })
})

describe("IFileSystem", () => {
  it.each(["jupyter"])
  ('.touch %s', async (name) => {
    const fs = await file_system_setup(name)
    await fs.touch("newfile")
    const filenames = await fs.list("")
    expect(filenames).toEqual(["dirA", "file1", "file2", "newfile"])
  })
})

describe("IFileSystem", () => {
  it.each(["jupyter"])
  ('.delete %s', async (name) => {
    const fs = await file_system_setup(name)
    await fs.delete("file1")
    const filenames = await fs.list("")
    expect(filenames).toEqual(["dirA", "file2"])
  })
})
