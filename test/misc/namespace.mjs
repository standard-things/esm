import assert from "assert"
import createNamespace from "../create-namespace.js"
import util from "util"
import * as ans from "../fixture/cycle/star/a.mjs"
import * as bns from "../fixture/cycle/star/b.mjs"
import * as ns1 from "../fixture/export/abc.mjs"
import * as ns2 from "../fixture/export/abc.mjs"

const { types } = util

export default () => {
  const abcNs = createNamespace({
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  })

  const starNs = createNamespace({
    a: "a",
    b: "b"
  })

  const namespaces = [ans, bns, ns1, ns2]

  assert.deepStrictEqual(ans, starNs)
  assert.deepStrictEqual(bns, ans)
  assert.deepStrictEqual(Object.keys(ans), ["a", "b"])
  assert.deepStrictEqual(Object.getOwnPropertyNames(ans), ["a", "b"])
  assert.notStrictEqual(ans, bns)

  assert.strictEqual(ns1, ns2)
  assert.deepStrictEqual(ns1, abcNs)

  namespaces.forEach((ns) => {
    assert.ok(Object.isSealed(ns))
    assert.strictEqual(Object.prototype.toString.call(ns), "[object Module]")
    assert.deepStrictEqual(Object.getOwnPropertySymbols(ns), [Symbol.toStringTag])

    if (types) {
      assert.ok(types.isModuleNamespaceObject(ns))
    } else {
      assert.ok(true)
    }
  })
}
