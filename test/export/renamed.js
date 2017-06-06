import assert from "assert"
import { append, x, y } from "../fixture/export/renamed.js"

export function check() {
  assert.strictEqual(x, y)
  assert.strictEqual(x, "a")
  assert.strictEqual(append("b"), "ab")
  assert.strictEqual(x, y)
  assert.strictEqual(x, "ab")
  assert.strictEqual(append("c"), "abc")
  assert.strictEqual(x, y)
  assert.strictEqual(x, "abc")
}
