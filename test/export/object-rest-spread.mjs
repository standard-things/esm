import assert from "assert"
import def, { a, rest } from "../fixture/export/object-rest-spread.mjs"

export default () => {
  assert.strictEqual(a, "a")
  assert.deepStrictEqual(rest, { b: "b", c: "c" })
  assert.deepStrictEqual(def, { a: "a", b: "b", c: "c", d: "d" })
}
