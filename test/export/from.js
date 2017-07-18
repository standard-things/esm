import assert from "assert"
import def1, { a, b, c, aa, bb, def2 } from "../fixture/export/from.js"

export function check() {
  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(c, "c")
  assert.strictEqual(aa, "a")
  assert.strictEqual(bb, "b")
  assert.strictEqual(def1, "a")
  assert.strictEqual(def2, "default")
}
