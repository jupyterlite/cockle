import { Command } from "../command"
import { Context } from "../context"
import { BooleanOption } from "../option"
import { Options } from "../options"

class LsOptions extends Options {
  commaSeparated = new BooleanOption("m", "", "List files across the page, separated by commas.")
  long = new BooleanOption("l", "", "List files in long format.")
  reverse = new BooleanOption("r", "", "Reverse the order of the sort.")
}

export class LsCommand extends Command<LsOptions> {
  override async run(context: Context): Promise<number> {
    const args = context.args
    const options = Options.fromArgs(args, LsOptions)

    // Validate and expand arguments (flags and file/directory names).
    // Only supporting single path and no flags so far.
    if (args.length > 1) {
      // Write error message to stderr
      return 1
    }

    const path = args.length == 0 ? (context.env_string("PWD") ?? "/"): args[0]
    let filenames = await context.filesystem.list(path)

    // Can use lines like this for options.
    if (options.reverse.isSet) {

    }

    const width = context.env_number("COLUMNS")
    const output = _toColumns(filenames, width)
    await context.stdout.write(output)  // How to deal with newlines?
    return 0
  }
}

function _range(n: number): number[] {
  const range = new Array<number>(n)
  for (let i = 0; i < n; ++i) {
    range[i] = i
  }
  return range
}

function _toColumns(paths: string[], width: number | null): string {
  function columnWidths(nCols: number): number[] {
    return _range(nCols).map((col) => Math.max(...lengths.slice(col*nRows, (col+1)*nRows)))
  }

  function nColsFromRows(nRows: number): number {
    return Math.ceil(lengths.length / nRows)
  }

  function singleColumn(): string {
    return paths.join("\r\n") + "\r\n"
  }

  function singleRow(): string {
    return paths.join("  ") + "\r\n"
  }

  function widthForRows(nRows: number): number {
    const nCols = nColsFromRows(nRows)
    return columnWidths(nCols).reduce((a, b) => a+b) + 2*nCols - 1
  }

  if (width == null || width < 1) {
    return singleColumn()
  }

  const lengths = paths.map((f) => f.length)
  if (lengths.reduce((a, b) => a+b) + 2*paths.length -1 <= width) {
    return singleRow()
  }

  const max = Math.max(...lengths)
  if (max + 1 >= width) {
    return singleColumn()
  }

  // Increase the number of rows until the filenames fit in the required width.
  // Can use min path length to find starting nRows > 2
  let nRows = 2
  while (widthForRows(nRows) > width) {
    nRows++
  }

  const nCols = nColsFromRows(nRows)
  const colWidths = columnWidths(nCols)

  const range = _range(nCols)
  let ret = ""
  for (let row = 0; row < nRows; ++row) {
    const indices = range.map((i) => row + i*nRows).filter((i) => i < paths.length)
    for (let col = 0; col < indices.length; col++) {
      const path = paths[indices[col]]
      ret += path
      if (col < indices.length - 1) {
        ret += " ".repeat(colWidths[col] - path.length + 2)
      }
    }
    ret += "\r\n"
  }
  // Probably want to return multiple rows, not a single string for all rows. And async.
  return ret
}
