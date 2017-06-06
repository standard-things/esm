import assert from "assert"
import { a, c, v, si } from "../fixture/export/some.js"

export function check() {
  assert.strictEqual(a, "a")
  assert.strictEqual(c(), "c")
  assert.strictEqual(v, "b")
  assert.strictEqual(si, "cee")
}
