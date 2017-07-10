import assert from "assert"
import value from "../fixture/export/cycle/a.js"

export function check() {
  assert.strictEqual(value, true)
}
