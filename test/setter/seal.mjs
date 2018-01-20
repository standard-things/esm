import assert from "assert"
import seal from "../fixture/cjs/setter/seal/a.mjs"

export default () => {
  assert.strictEqual(seal.a, "a")
}
