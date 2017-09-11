import assert from "assert"
import def, { a, rest } from "../fixture/export/object-rest-spread.mjs"

export default function () {
  assert.strictEqual(a, "a")
  assert.deepEqual(rest, { b: "b", c: "c" })
  assert.deepEqual(def, { a: "a", b: "b", c: "c", d: "d" })
}
