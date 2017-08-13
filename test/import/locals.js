import assert from "assert"
import { a as x, a as y } from "../fixture/export/abc.mjs"

export function check() {
  assert.strictEqual(x, "a")
  assert.strictEqual(y, "a")
}
