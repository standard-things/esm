import assert from "assert"
import seal from "../fixture/cycle/seal/a.mjs"

export default () => {
  assert.strictEqual(seal.a, "a")
}
