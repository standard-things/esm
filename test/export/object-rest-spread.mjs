import assert from "assert"
import abcd, { a, bc, d } from "../fixture/export/object-rest-spread.mjs"

export default () => {
  assert.strictEqual(a, "a")
  assert.deepStrictEqual(bc, { b: "b", c: "c" })
  assert.deepStrictEqual(d(abcd), { b: "b", c: "c", d })
  assert.deepStrictEqual(abcd, { a: "a", b: "b", c: "c", d })
}
