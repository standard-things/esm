import
  /* eslint brace-style: off */
  assert

from "assert"

export

function check()

{
  const error = new Error // Line 12.
  const line = error.stack.match(/:(\d+)/)[1]
  assert.strictEqual(line, "12")
}
