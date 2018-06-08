import assert from "assert"
import { a, b, c, rest } from "../fixture/export/destructuring.mjs"
import { a0, a2, update } from "../fixture/export/holes.mjs"
import { swap, x, y } from "../fixture/export/swap.mjs"

export default () => {
  // Should support destructuring declarations.
  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(c, "c")
  assert.deepStrictEqual(rest, [b, c])

  // Should support array patterns with holes.
  assert.strictEqual(a0, 0)
  assert.strictEqual(a2, 2)
  assert.strictEqual(update(3, 4, 5), 8)
  assert.strictEqual(a0, 3)
  assert.strictEqual(a2, 5)

  // Should invoke destructuring setters.
  assert.strictEqual(x, 1)
  assert.strictEqual(y, 2)
  swap()
  assert.strictEqual(x, 2)
  assert.strictEqual(y, 1)
}
