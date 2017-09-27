import assert from "assert"
import defaultArray, * as nsArray from "../../fixture/cjs/exports-array.js"
import defaultClass, { a as namedClass } from "../../fixture/cjs/exports-class.js"
import defaultDefault, * as nsDefault from "../../fixture/cjs/exports-default.js"
import defaultEmpty, * as nsEmpty from "../../fixture/cjs/exports-empty.js"
import defaultExports from "../../fixture/cjs/exports-exports.mjs"
import defaultFunction, { a as namedFunction } from "../../fixture/cjs/exports-function.js"
import defaultNull, * as nsNull from "../../fixture/cjs/exports-null.js"
import defaultNumber, * as nsNumber from "../../fixture/cjs/exports-number.js"
import defaultObject, { a as namedObject } from "../../fixture/cjs/exports-object.js"
import defaultPseudo, { a as namedPseudo } from "../../fixture/cjs/exports-pseudo.js"
import defaultUndefined, * as nsUndefined from "../../fixture/cjs/exports-undefined.js"
import * as nsClass from "../../fixture/cjs/exports-class.js"
import * as nsEmptyPseudo from "../../fixture/cjs/exports-pseudo-empty.js"
import * as nsPseudo from "../../fixture/cjs/exports-pseudo.js"
import * as nsFunction from "../../fixture/cjs/exports-function.js"
import * as nsSafe from "../../fixture/cjs/exports-get-set.js"

export default () => {
  assert.deepEqual(defaultArray, ["a"])
  assert.strictEqual(nsArray.default, defaultArray)

  assert.strictEqual(typeof defaultClass, "function")
  assert.strictEqual(nsClass.default, defaultClass)
  assert.strictEqual(namedClass, "a")

  assert.strictEqual(defaultDefault.default, "default")
  assert.strictEqual(defaultDefault, nsDefault.default)

  assert.strictEqual(defaultPseudo, "default")
  assert.strictEqual(nsPseudo.default, defaultPseudo)
  assert.strictEqual(namedPseudo, "a")

  assert.strictEqual(defaultFunction(), "ok")
  assert.strictEqual(nsFunction.default, defaultFunction)
  assert.strictEqual(namedFunction, "a")

  assert.strictEqual(defaultNull, null)
  assert.strictEqual(nsNull.default, defaultNull)

  assert.strictEqual(defaultNumber, 1)
  assert.strictEqual(nsNumber.default, defaultNumber)

  assert.deepEqual(defaultObject, { a: "a" })
  assert.strictEqual(namedObject, "a")

  assert.strictEqual(defaultUndefined, void 0)
  assert.strictEqual(nsUndefined.default, defaultUndefined)

  assert.deepEqual(nsEmpty, { default: {} })
  assert.deepEqual(nsEmptyPseudo, {})

  const objectProto = Object.prototype
  assert.strictEqual(Object.getPrototypeOf(defaultEmpty), objectProto)
  assert.strictEqual(Object.getPrototypeOf(defaultExports), objectProto)

  assert.strictEqual(nsSafe.safe, "safe get")
  nsSafe.safe = "safe set"

  assert.strictEqual(nsSafe.safe, "safe set")
  nsSafe.safe = "safe get"

  const desc = Object.getOwnPropertyDescriptor(nsSafe, "safe")
  assert.ok("get" in desc)
  assert.ok("set" in desc)
}
