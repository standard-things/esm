import assert from "assert"
import { c } from "../fixture/tree/parent.mjs"
import { increment } from "../fixture/tree/grandchild.mjs"

export default () => {
  assert.strictEqual(c, 0)
  increment()
  assert.strictEqual(c, 1)
}
