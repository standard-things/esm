import assert from "assert"
import { a as aa, b as ab } from "../fixture/cycle/star/a.mjs"
import { a as ba, b as bb } from "../fixture/cycle/star/b.mjs"
import { b } from "../fixture/cycle/star-tracking/a.mjs"

export default () => {
  assert.strictEqual(aa, "a")
  assert.strictEqual(ba, "a")
  assert.strictEqual(ab, "b")
  assert.strictEqual(bb, "b")
  assert.strictEqual(b, "b")
}
