import assert from "assert"
import a from "../fixture/cycle/bindings/a.mjs"

export default () => {
  assert.strictEqual(a, "a")
}
