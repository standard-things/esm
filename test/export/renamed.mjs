import assert from "assert"
import { x as a, append, x, y } from "../fixture/export/renamed.mjs"

export default () => {
  assert.strictEqual(x, a)
  assert.strictEqual(x, y)
  assert.strictEqual(x, "a")
  assert.strictEqual(append("b"), "ab")

  assert.strictEqual(x, a)
  assert.strictEqual(x, y)
  assert.strictEqual(x, "ab")
  assert.strictEqual(append("c"), "abc")

  assert.strictEqual(x, a)
  assert.strictEqual(x, y)
  assert.strictEqual(x, "abc")
}
