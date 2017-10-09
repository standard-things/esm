import assert from "assert"
import createNamespace from "../create-namespace.js"
import * as ans from "../fixture/cycle/star/a.mjs"
import * as bns from "../fixture/cycle/star/b.mjs"
import * as ns1 from "../fixture/export/abc.mjs"
import * as ns2 from "../fixture/export/abc.mjs"

const toStringTag = Symbol.toStringTag

const useToStringTag = typeof toStringTag === "symbol"

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
  const nsSymbols = useToStringTag ? [toStringTag] : []
  const nsTag = useToStringTag ? "[object Module]" : "[object Object]"

  namespaces.forEach((ns) => {
    assert.ok(Object.isSealed(ns))
    assert.deepStrictEqual(Object.getOwnPropertySymbols(ns), nsSymbols)
    assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
  })

  assert.deepStrictEqual(ans, starNs)
  assert.deepStrictEqual(bns, ans)
  assert.deepStrictEqual(Object.keys(ans), ["a", "b"])
  assert.deepStrictEqual(Object.getOwnPropertyNames(ans).sort(), ["a", "b"])
  assert.notStrictEqual(ans, bns)

  assert.deepStrictEqual(ns1, abcNs)
  assert.strictEqual(ns1, ns2)
}
