import assert from "assert"
import value from "../export/cycle-a"

export function check() {
  assert.strictEqual(value, true)
}
