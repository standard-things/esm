import assert from "assert"
import { a, c as b, d, e, f, rest } from "../fixture/export/destructuring.mjs"
import { a0, a2, update } from "../fixture/export/holes.mjs"
import { x, y, swap } from "../fixture/export/swap.mjs"

export function check() {
  // Should support destructuring declarations.
  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(d, "d")
  assert.strictEqual(e, "e")
  assert.strictEqual(f, "f")
  assert.deepEqual(rest, [a, b, d])

  // Should not crash on array patterns with holes.
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
