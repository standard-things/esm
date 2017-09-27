import assert from "assert"
import { add, reset, value } from "../fixture/live.mjs"

export default () => {
  reset()
  assert.strictEqual(value, 0)

  add(2)
  add(2)
  assert.strictEqual(value, 4)

  assert.strictEqual(reset(), 0)
  assert.strictEqual(value, 0)
}
