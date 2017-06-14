import assert from "assert"
import * as ns1 from "../fixture/abc.js"
import * as ns2 from "../fixture/abc.js"

export function check() {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: { a: "a", b: "b", c: "c" }
  }

  const nsTag = typeof Symbol.toStringTag === "symbol"
    ? "[object Module]"
    : "[object Object]"

  assert.deepEqual(ns1, abcNs)
  assert.ok(Object.isSealed(ns1))
  assert.strictEqual(Object.prototype.toString.call(ns1), nsTag)
  assert.strictEqual(ns1, ns2)
}
