import assert from "assert"
import createNamespace from "../create-namespace.js"
import { c } from "../fixture/export/star-from/a.mjs"
import def, { a, b, c as d } from "../fixture/export/star-with-default.mjs"
import * as ns from "../fixture/export/star-without-default.mjs"

export default () => {
  const starNs = createNamespace({
    a: "a",
    b: "b",
    c: "c"
  })

  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(c, "c")
  assert.strictEqual(d, "c")
  assert.strictEqual(def, "default")
  assert.deepStrictEqual(ns, starNs)
}
