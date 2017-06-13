import assert from "assert"
import { add, reset, value } from "../fixture/cjs/bridge.js"
import * as fns from "../fixture/cjs/exports-function.js"
import fdef, { a as fa, b as fb, c as fc } from "../fixture/cjs/exports-function.js"
import ndef, * as nns from "../fixture/cjs/exports-null.js"
import * as getter from "../fixture/cjs/exports-getter.js"
import odef, { a as oa, b as ob, c as oc } from "../fixture/cjs/exports-object.js"

export function check() {
  assert.strictEqual(typeof fdef, "function")
  assert.strictEqual(fdef(), "ok")
  assert.strictEqual(fns.default, fdef)
  assert.deepEqual([fa, fb, fc], ["a", "b", "c"])

  assert.strictEqual(ndef, null)
  assert.strictEqual(nns.default, ndef)

  assert.deepEqual(odef, { a: 1, b: 2, c: 3 })
  assert.deepEqual([oa, ob, oc], [1, 2, 3])

  odef.c = 4
  module.runSetters.call({ exports: odef })
  assert.strictEqual(oc, 4)

  add(10)
  assert.strictEqual(value, 10)
  assert.strictEqual(reset(), 0)
  assert.strictEqual(value, 0)

  assert.strictEqual(getter.safe, "safe")
}
