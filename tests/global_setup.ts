// Jest global setup.

// Ensure that WASM files believe ENVIRONMENT_IS_WEB by using jsdom and
// prevent ENVIRONMENT_IS_NODE by monkey-patching global process.
var originalProcess: any

beforeAll(() => {
  originalProcess = process
  global.process = {...originalProcess, versions: undefined}
})

afterAll(() => {
 global.process = originalProcess
})
