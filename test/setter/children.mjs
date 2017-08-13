import assert from "assert"
import { c } from "../fixture/tree/parent.mjs"
import { increment } from "../fixture/tree/grandchild.mjs"

export function check() {
  assert.strictEqual(c, 0)
  increment()
  assert.strictEqual(c, 1)
}
