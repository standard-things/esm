import assert from "assert"
import { value } from "../fixture/export/const.js"

export function check() {
  value = 2
  assert.strictEqual(value, 2)
}
