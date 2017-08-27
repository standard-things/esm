import

  assert

from "assert"

export

function check()
// eslint-disable-next-line brace-style
{
  const error = new Error // Line 12.
  const line = error.stack.match(/:(\d+)/)[1]
  assert.strictEqual(line, "12")
}
