import assert from "assert"
import def from "../fixture/export/common.js"

export function check() {
  assert.strictEqual(def, "pure CommonJS")
}
