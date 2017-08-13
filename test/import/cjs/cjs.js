import assert from "assert"
import { add, reset, value } from "../../fixture/cjs/bridge.js"
import ddef, * as dns from "../../fixture/cjs/exports-default.js"
import * as ens from "../../fixture/cjs/exports-esmodule.js"
import edef, { a as ea, b as eb, c as ec } from "../../fixture/cjs/exports-esmodule.js"
import * as fns from "../../fixture/cjs/exports-function.js"
import fdef, { a as fa, b as fb, c as fc } from "../../fixture/cjs/exports-function.js"
import ndef, * as nns from "../../fixture/cjs/exports-null.js"
import odef, { a as oa, b as ob, c as oc } from "../../fixture/cjs/exports-object.js"
import udef, * as uns from "../../fixture/cjs/exports-undefined.js"
import * as empty from "../../fixture/cjs/exports-empty.js"
import * as emptyESM from "../../fixture/cjs/exports-esmodule-empty.js"
import * as getSet from "../../fixture/cjs/exports-get-set.js"

export function check() {
  assert.strictEqual(ddef.default, "default")
  assert.strictEqual(ddef, dns.default)

  assert.strictEqual(edef, "default")
  assert.strictEqual(ens.default, edef)
  assert.deepEqual([ea, eb, ec], ["a", "b", "c"])

  assert.strictEqual(fdef(), "ok")
  assert.strictEqual(fns.default, fdef)
  assert.deepEqual([fa, fb, fc], ["a", "b", "c"])

  assert.strictEqual(ndef, null)
  assert.strictEqual(nns.default, ndef)

  assert.deepEqual(odef, { a: 1, b: 2, c: 3 })
  assert.deepEqual([oa, ob, oc], [1, 2, 3])

  assert.strictEqual(udef, void 0)
  assert.strictEqual(uns.default, udef)

  add(5)
  add(5)

  assert.strictEqual(value, 10)
  assert.strictEqual(reset(), 0)
  assert.strictEqual(value, 0)

  assert.deepEqual(empty, { default: {} })
  assert.deepEqual(emptyESM, {})

  assert.strictEqual(getSet.safe, "safe")
  getSet.safe = "so safe"
  assert.strictEqual(getSet.safe, "so safe")

  const desc = Object.getOwnPropertyDescriptor(getSet, "safe")

  assert.ok("get" in desc)
  assert.ok("set" in desc)
}
