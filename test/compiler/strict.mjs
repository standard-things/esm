import assert from "assert"

export default function () {
  const that = (function () {
    return this
  })()

  assert.strictEqual(that, void 0)
}
