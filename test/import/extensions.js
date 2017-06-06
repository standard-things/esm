import assert from "assert"
import * as ns1 from "../fixture/abc.js"
import { a, b as c }, * as ns2 from "../fixture/abc.js"
import def1 from "../fixture/abc.js"
import def2, { b, c as d } from "../fixture/abc.js"
import def3, * as ns3 from "../fixture/abc.js"
import * as ns4, * as ns5, { c as e }, def4, def5 from "../fixture/abc.js"

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

  defs.forEach((def) => {
    assert.deepEqual(def, abcNs.default)
    assert.strictEqual(def, def1)
  })

  namespaces.forEach((ns) => {
    assert.deepEqual(ns, abcNs)
    assert.strictEqual(ns.default, def1)
  })
}
