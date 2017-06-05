import assert from "assert"
import * as ns1 from "../misc/abc"
import { a, b as c }, * as ns2 from "../misc/abc"
import def1 from "../misc/abc"
import def2, { b, c as d } from "../misc/abc"
import def3, * as ns3 from "../misc/abc"
import * as ns4, * as ns5, { c as e }, def4, def5 from "../misc/abc"

export function check() {
  const abcNs = {
    a: "a",
    b: "b",
    c: "c",
    default: { a: "a", b: "b", c: "c" }
  }

  const defs = [
    def2, def3, def4, def5
  ]

  const namespaces = [
    ns1, ns2, ns3, ns4, ns5
  ]

  defs.forEach((d) => {
    assert.deepEqual(d, abcNs.default)
    assert.strictEqual(d, def1)
  })

  namespaces.forEach((ns) => {
    assert.deepEqual(ns, abcNs)
    assert.strictEqual(ns.default, def1)
  })
}
