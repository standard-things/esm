import assert from "assert"
import createNamespace from "../create-namespace.js"
import def, { a, b } from "../fixture/export/star-with-default.mjs"
import { c, d } from "../fixture/export/star-from-default/a.mjs"
import * as ns from "../fixture/export/star-without-default.mjs"

export default () => {
  const starNs = createNamespace({
    a: "a",
    b: "b",
    c: "c"
  })

  assert.strictEqual(def, "default")
  assert.deepStrictEqual([a, b, c, d], ["a", "b", "c", "d"])
  assert.deepStrictEqual(ns, starNs)
}
