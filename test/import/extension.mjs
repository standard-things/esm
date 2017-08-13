import assert from "assert"
import def from "../fixture/export/abc.mjs"
import {
  def1, def2, def3, def4, def5,
  ns1, ns2, ns3, ns4, ns5,
  a, b, c, d, e
} from "../fixture/extension/import.js"

export function check() {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const defs = [
    def1, def2, def3, def4, def5
  ]

  const namespaces = [
    ns1, ns2, ns3, ns4, ns5
  ]

  defs.forEach((d) => {
    assert.deepEqual(d, abcNs.default)
    assert.strictEqual(d, def)
  })

  namespaces.forEach((ns) => {
    assert.deepEqual(ns, abcNs)
    assert.strictEqual(ns.default, def)
  })

  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(c, "b")
  assert.strictEqual(d, "c")
  assert.strictEqual(e, "c")
}
