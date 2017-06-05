import assert from "assert"

export let value = 0

export function check() {
  const module = null
  const module2 = null
  assert.strictEqual(++value, 1)
}
