import assert from "assert"
import createNamespace from "../create-namespace.js"
import { a as aa, b as ab } from "../fixture/cycle/star/a.mjs"
import { a as ba, b as bb } from "../fixture/cycle/star/b.mjs"
import * as ans from "../fixture/cycle/star/a.mjs"
import * as bns from "../fixture/cycle/star/b.mjs"

export default () => {
  const starNs = createNamespace({
    a: "a",
    b: "b"
  })

  assert.strictEqual(aa, "a")
  assert.strictEqual(ab, "b")
  assert.strictEqual(ba, "a")
  assert.strictEqual(bb, "b")
  assert.deepStrictEqual(ans, starNs)
  assert.deepStrictEqual(ans, bns)
}
