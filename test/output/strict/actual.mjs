import assert from "assert"

export function check() {
  const that = (function () { return this })()
  assert.strictEqual(that, void 0)
}
