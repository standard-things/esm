import assert from "assert"
import * as ans from "../fixture/export/all-mutual/a.js"
import * as bns from "../fixture/export/all-mutual/b.js"
import * as ns1 from "../fixture/export/abc.js"
import * as ns2 from "../fixture/export/abc.js"

const useToStringTag = typeof Symbol.toStringTag === "symbol"

export function check() {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const mutualNs = {
    a: "a",
    b: "b"
  }

  const namespaces = [
    ans, bns, ns1, ns2
  ]

  const nsSymbols = useToStringTag ? [Symbol.toStringTag] : []
  const nsTag = useToStringTag ? "[object Module]" : "[object Object]"

  namespaces.forEach((ns) => {
    assert.ok(Object.isSealed(ns))
    assert.deepEqual(Object.getOwnPropertySymbols(ns), nsSymbols)
    assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
  })

  assert.deepEqual(ans, mutualNs)
  assert.deepEqual(bns, mutualNs)
  assert.deepEqual(Object.keys(ans), ["a", "b"])
  assert.deepEqual(Object.getOwnPropertyNames(ans).sort(), ["a", "b"])
  assert.notStrictEqual(ans, bns)

  assert.deepEqual(ns1, abcNs)
  assert.strictEqual(ns1, ns2)
}
