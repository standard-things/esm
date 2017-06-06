import assert from "assert"
import { value } from "../fixture/const.js"

export function check() {
  value = 2
  assert.strictEqual(value, 2)
}
