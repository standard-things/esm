import assert from "assert"

export let value = 0

export function check() {
  const exports = null
  const exports2 = null
  const module = null
  const module2 = null
  assert.strictEqual(++value, 1)
}
