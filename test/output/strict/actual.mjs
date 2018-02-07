import assert from "assert"

export default () => {
  const that = (function () {
    return this
  })()

  assert.strictEqual(typeof that, "undefined")
}
