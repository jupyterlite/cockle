/**
 * Enum for command type, useful for filtering commands.
 */
export enum CommandType {
  None = 0,
  Unknown = 1 << 0,
  Builtin = 1 << 1,
  External = 1 << 2,
  JavaScript = 1 << 3,
  Wasm = 1 << 4,
  All = Unknown | Builtin | External | JavaScript | Wasm
}
