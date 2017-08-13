import assert from "assert"
import def from "../fixture/export/cycle/a.mjs"

export function check() {
  assert.strictEqual(def, true)
}
