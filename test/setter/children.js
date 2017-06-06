import assert from "assert"
import { c } from "../fixture/tree/parent.js"
import { increment } from "../fixture/tree/grandchild.js"

export function check() {
  assert.strictEqual(c, 0)
  increment()
  assert.strictEqual(c, 1)
}
