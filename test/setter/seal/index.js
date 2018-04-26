import assert from "assert"
import seal from "../../fixture/cjs/setter/seal/a.js"

export default () => {
  assert.strictEqual(seal.a, "a")
}
