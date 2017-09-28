import assert from "assert"
import defaultArray, * as nsArray from "../../fixture/cjs/exports-array.js"
import defaultClass, { a as aOfClass } from "../../fixture/cjs/exports-class.js"
import defaultDefault, * as nsDefault from "../../fixture/cjs/exports-default.js"
import defaultEmpty, * as nsEmpty from "../../fixture/cjs/exports-empty.js"
import defaultExports from "../../fixture/cjs/exports-exports.mjs"
import defaultFunction, { a as aOfFunction } from "../../fixture/cjs/exports-function.js"
import defaultNull, * as nsNull from "../../fixture/cjs/exports-null.js"
import defaultNumber, * as nsNumber from "../../fixture/cjs/exports-number.js"
import defaultObject, { a as aOfObject } from "../../fixture/cjs/exports-object.js"
import defaultOfExports, { a as aOfExports } from "../../fixture/cjs/exports-of-exports.mjs"
import defaultPseudo, { a as aOfPseudo } from "../../fixture/cjs/exports-pseudo.js"
import defaultUndefined, * as nsUndefined from "../../fixture/cjs/exports-undefined.js"
import * as nsClass from "../../fixture/cjs/exports-class.js"
import * as nsEmptyPseudo from "../../fixture/cjs/exports-pseudo-empty.js"
import * as nsOfExports from "../../fixture/cjs/exports-of-exports.mjs"
import * as nsPseudo from "../../fixture/cjs/exports-pseudo.js"
import * as nsFunction from "../../fixture/cjs/exports-function.js"
import * as nsSafe from "../../fixture/cjs/exports-get-set.js"

function isPlainObject(object) {
  return Object.getPrototypeOf(object) === Object.prototype
}

export default () => {
  assert.deepEqual(defaultArray, ["a"])
  assert.deepEqual(nsArray, { 0: "a", default: defaultArray })

  assert.strictEqual(aOfClass, "a")
  assert.strictEqual(typeof defaultClass, "function")
  assert.deepEqual(nsClass, { default: defaultClass })

  assert.deepEqual(defaultDefault, { default: "default" })
  assert.deepEqual(nsDefault, { default: defaultDefault })

  assert.strictEqual(aOfFunction, "a")
  assert.strictEqual(defaultFunction(), "ok")
  assert.deepEqual(nsFunction, { a: "a", default: defaultFunction })

  assert.strictEqual(defaultNull, null)
  assert.deepEqual(nsNull, { default: defaultNull })

  assert.strictEqual(defaultNumber, 1)
  assert.deepEqual(nsNumber, { default: defaultNumber })

  assert.deepEqual(defaultObject, { a: "a" })
  assert.strictEqual(aOfObject, "a")

  assert.strictEqual(aOfExports, "a")
  assert.strictEqual(defaultOfExports, "default")
  assert.deepEqual(nsOfExports, { a: "a", b: "b", default: "default" })

  assert.strictEqual(aOfPseudo, "a")
  assert.strictEqual(defaultPseudo, "default")
  assert.deepEqual(nsPseudo, { a: "a", default: "default" })

  assert.strictEqual(defaultUndefined, void 0)
  assert.deepEqual(nsUndefined, { default: defaultUndefined })

  assert.deepEqual(nsEmpty, { default: {} })
  assert.deepEqual(nsEmptyPseudo, {})

  const objects = [defaultEmpty, defaultExports]
  objects.forEach((object) => assert.ok(isPlainObject(object)))

  assert.strictEqual(nsSafe.safe, "safe get")
  nsSafe.safe = "safe set"

  assert.strictEqual(nsSafe.safe, "safe set")
  nsSafe.safe = "safe get"

  const desc = Object.getOwnPropertyDescriptor(nsSafe, "safe")
  assert.ok("get" in desc)
  assert.ok("set" in desc)
}
