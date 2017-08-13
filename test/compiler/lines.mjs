import

  assert

from "assert"

export
// eslint-disable-next-line brace-style
function check()

{
  const error = new Error // Line 12.
  const line = error.stack.match(/:(\d+)/)[1]
  assert.strictEqual(line, "12")
}
