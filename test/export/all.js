import assert from "assert"
import def, { d, e, f as g } from "../fixture/export/all.js"

export function check() {
  assert.strictEqual(d, "d")
  assert.strictEqual(e, "e")
  assert.strictEqual(g, "f")
  assert.strictEqual(def, "default")
}
