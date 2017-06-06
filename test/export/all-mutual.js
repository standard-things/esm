import assert from "assert"
import { a as aa, b as ab } from "../fixture/export/all-mutual/a.js"
import { a as ba, b as bb } from "../fixture/export/all-mutual/b.js"

export function check() {
  assert.strictEqual(aa, "a")
  assert.strictEqual(ab, "b")
  assert.strictEqual(ba, "a")
  assert.strictEqual(bb, "b")
}
