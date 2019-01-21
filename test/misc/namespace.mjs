import assert from "assert"
import createNamespace from "../create-namespace.js"
import util from "util"
import * as ans from "../fixture/cycle/star/a.mjs"
import * as bns from "../fixture/cycle/star/b.mjs"
import * as ns1 from "../fixture/export/abc.mjs"
import * as ns2 from "../fixture/export/abc.mjs"

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

  assert.deepStrictEqual(ans, starNs)
  assert.deepStrictEqual(bns, ans)
  assert.deepStrictEqual(Object.keys(ans), ["a", "b"])
  assert.deepStrictEqual(Object.getOwnPropertyNames(ans), ["a", "b"])
  assert.notStrictEqual(ans, bns)

  assert.strictEqual(ns1, ns2)
  assert.deepStrictEqual(ns1, abcNs)

  const namespaces = [ans, bns, ns1, ns2]
  const { types } = util

  for (const ns of namespaces) {
    assert.ok(Object.isSealed(ns))
    assert.strictEqual(Object.prototype.toString.call(ns), "[object Module]")
    assert.deepStrictEqual(Object.getOwnPropertySymbols(ns), [Symbol.toStringTag])

    if (types) {
      assert.ok(types.isModuleNamespaceObject(ns))
    } else {
      assert.ok(true)
    }

    assert.throws(
      () => Object.freeze(ns),
      /TypeError: Cannot redefine/
    )

    assert.throws(
      () => ns.d = "d",
      /TypeError: Cannot add/
    )

    assert.throws(
      () => Object.defineProperty(ns, "d", {
        configurable: true,
        enumerable: true,
        value: "d",
        writable: true
      }),
      /TypeError: Cannot define/
    )

    assert.throws(
      () => Object.defineProperty(ns, "a", {
        configurable: true,
        enumerable: true,
        value: 1,
        writable: true
      }),
      /TypeError: Cannot redefine/
    )

    assert.throws(
      () => delete ns.a,
      /TypeError: Cannot delete/
    )

    assert.strictEqual(delete ns.d, true)
  }
}
