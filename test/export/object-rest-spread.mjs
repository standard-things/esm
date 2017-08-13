import assert from "assert"
import { a, b } from "../fixture/export/object-rest-spread.mjs"

export function check() {
  assert.strictEqual(a, "a")
  assert.deepEqual(b, { a: "a", b: "b", c: "c" })
}
