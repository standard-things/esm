import assert from "assert"
import { add, reset, value } from "../fixture/live.mjs"

export default function () {
  reset()
  assert.strictEqual(value, 0)
  add(2)
  assert.strictEqual(value, 2)
}
