import assert from "assert"
import def, { a, b, c, aa, bb, abc } from "../fixture/export/from.js"

export function check() {
  assert.strictEqual(def, "a")
  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(c, "c")
  assert.strictEqual(aa, "a")
  assert.strictEqual(bb, "b")
  assert.deepEqual(abc, { a: "a", b: "b", c: "c" })
}
