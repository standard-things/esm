import assert from "assert"
import def, { a, b, c as d } from "../fixture/export/all.js"

export function check() {
  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(d, "c")
  assert.strictEqual(def, "default")
}
