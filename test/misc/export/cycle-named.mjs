import assert from "assert"
import def from "../../fixture/cycle/named/a.mjs"

export default () => {
  assert.strictEqual(def, true)
}
