import assert from "assert"
import def from "../fixture/export/async-generators.mjs"

export default () => {
  assert.strictEqual(typeof def, "function")
}
