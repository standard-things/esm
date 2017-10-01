import assert from "assert"
import * as ans from "../fixture/cycle/star/a.mjs"
import * as bns from "../fixture/cycle/star/b.mjs"
import * as ns1 from "../fixture/export/abc.mjs"
import * as ns2 from "../fixture/export/abc.mjs"

const useToStringTag = typeof Symbol.toStringTag === "symbol"

export default () => {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const namespaces = [ans, bns, ns1, ns2]
  const nsSymbols = useToStringTag ? [Symbol.toStringTag] : []
  const nsTag = useToStringTag ? "[object Module]" : "[object Object]"

  namespaces.forEach((ns) => {
    assert.ok(Object.isSealed(ns))
    assert.deepEqual(Object.getOwnPropertySymbols(ns), nsSymbols)
    assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
  })

  assert.deepEqual(ans, { a: "a", b: "b" })
  assert.deepEqual(bns, ans)
  assert.deepEqual(Object.keys(ans), ["a", "b"])
  assert.deepEqual(Object.getOwnPropertyNames(ans).sort(), ["a", "b"])
  assert.notStrictEqual(ans, bns)

  assert.deepEqual(ns1, abcNs)
  assert.strictEqual(ns1, ns2)
}
