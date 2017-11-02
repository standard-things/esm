import assert from "assert"
import def from "../fixture/export/for-await-of.mjs"

export default () => {
  assert.strictEqual(typeof def, "function")
}
