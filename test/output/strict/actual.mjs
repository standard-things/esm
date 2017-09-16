import assert from "assert"

export default () => {
  const that = (function () {
    return this
  })()

  assert.strictEqual(that, void 0)
}
