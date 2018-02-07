import assert from "assert"

const that = this

export default () => {
  assert.strictEqual(typeof that, "undefined")
}
