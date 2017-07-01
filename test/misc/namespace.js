import assert from "assert"
import * as ans from "../fixture/export/all-mutual/a.js"
import * as bns from "../fixture/export/all-mutual/b.js"
import * as ns1 from "../fixture/abc.js"
import * as ns2 from "../fixture/abc.js"

export function check() {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: { a: "a", b: "b", c: "c" }
  }

  const mutualNs = {
    a: "a",
    b: "b"
  }

  const nsTag = typeof Symbol.toStringTag === "symbol"
    ? "[object Module]"
    : "[object Object]"

  const namespaces = [
    ans, bns, ns1, ns2
  ]

  namespaces.forEach((ns) => {
    assert.ok(Object.isSealed(ns))
    assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
  })

  assert.deepEqual(ans, mutualNs)
  assert.deepEqual(bns, mutualNs)
  assert.notStrictEqual(ans, bns)
  assert.deepEqual(ns1, abcNs)
  assert.strictEqual(ns1, ns2)
}
