import assert from "assert"
import { add, reset, value } from "../../fixture/cjs/bridge.js"
import adef, * as ans from "../../fixture/cjs/exports-array.js"
import cdef, { a as ca } from "../../fixture/cjs/exports-class.js"
import ddef, * as dns from "../../fixture/cjs/exports-default.js"
import edef, { a as ea } from "../../fixture/cjs/exports-esmodule.js"
import fdef, { a as fa } from "../../fixture/cjs/exports-function.js"
import nuldef, * as nulns from "../../fixture/cjs/exports-null.js"
import numdef, * as numns from "../../fixture/cjs/exports-number.js"
import odef, { a as oa } from "../../fixture/cjs/exports-object.js"
import udef, * as uns from "../../fixture/cjs/exports-undefined.js"
import * as cns from "../../fixture/cjs/exports-class.js"
import * as ens from "../../fixture/cjs/exports-esmodule.js"
import * as fns from "../../fixture/cjs/exports-function.js"
import * as empty from "../../fixture/cjs/exports-empty.js"
import * as emptyESM from "../../fixture/cjs/exports-esmodule-empty.js"
import * as getSet from "../../fixture/cjs/exports-get-set.js"

export default function () {
  assert.deepEqual(adef, [1])
  assert.strictEqual(ans.default, adef)

  assert.strictEqual(typeof cdef, "function")
  assert.strictEqual(cns.default, cdef)
  assert.strictEqual(ca, "a")

  assert.strictEqual(ddef.default, "default")
  assert.strictEqual(ddef, dns.default)

  assert.strictEqual(edef, "default")
  assert.strictEqual(ens.default, edef)
  assert.strictEqual(ea, "a")

  assert.strictEqual(fdef(), "ok")
  assert.strictEqual(fns.default, fdef)
  assert.strictEqual(fa, "a")

  assert.strictEqual(nuldef, null)
  assert.strictEqual(nulns.default, nuldef)

  assert.strictEqual(numdef, 1)
  assert.strictEqual(numns.default, numdef)

  assert.deepEqual(odef, { a: "a" })
  assert.strictEqual(oa, "a")

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
  getSet.safe = "safe"

  const desc = Object.getOwnPropertyDescriptor(getSet, "safe")

  assert.ok("get" in desc)
  assert.ok("set" in desc)
}
