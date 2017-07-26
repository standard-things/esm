import assert from "assert"
import def from "../fixture/export/cycle/a.js"

export function check() {
  assert.strictEqual(def, true)
}
