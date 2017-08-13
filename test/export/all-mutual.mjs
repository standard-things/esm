import assert from "assert"
import { a as aa, b as ab } from "../fixture/export/all-mutual/a.mjs"
import { a as ba, b as bb } from "../fixture/export/all-mutual/b.mjs"
import * as ans from "../fixture/export/all-mutual/a.mjs"
import * as bns from "../fixture/export/all-mutual/b.mjs"

export function check() {
  assert.strictEqual(aa, "a")
  assert.strictEqual(ab, "b")
  assert.strictEqual(ba, "a")
  assert.strictEqual(bb, "b")
  assert.deepEqual(ans, { a: "a", b: "b" })
  assert.deepEqual(ans, bns)
}
