import assert from "assert"
import createNamespace from "../../create-namespace.js"
import isPlainObject from "../../is-plain-object.js"
import defaultArray, * as nsArray from "../../fixture/cjs/exports-array.js"
import defaultClass, * as nsClass from "../../fixture/cjs/exports-class.js"
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
import * as nsEmptyPseudo from "../../fixture/cjs/exports-pseudo-empty.js"
import * as nsOfExports from "../../fixture/cjs/exports-of-exports.mjs"
import * as nsPseudo from "../../fixture/cjs/exports-pseudo.js"
import * as nsFunction from "../../fixture/cjs/exports-function.js"
import * as nsSafe from "../../fixture/cjs/exports-get-set.js"

const getDescriptor = Object.getOwnPropertyDescriptor

export default () => {
  let ns = createNamespace({ 0: "a", default: defaultArray })
  assert.deepStrictEqual(defaultArray, ["a"])
  assert.deepStrictEqual(nsArray, ns)

  ns = createNamespace({ default: defaultClass })
  assert.strictEqual(typeof defaultClass, "function")
  assert.deepStrictEqual(nsClass, ns)

  ns = createNamespace({ default: defaultDefault })
  assert.deepStrictEqual(defaultDefault, { default: "default" })
  assert.deepStrictEqual(nsDefault, ns)

  ns = createNamespace({ a: "a", default: defaultFunction })
  assert.strictEqual(aOfFunction, "a")
  assert.strictEqual(defaultFunction(), "ok")
  assert.deepStrictEqual(nsFunction, ns)

  ns = createNamespace({ default: defaultNull })
  assert.strictEqual(defaultNull, null)
  assert.deepStrictEqual(nsNull, ns)

  ns = createNamespace({ default: defaultNumber })
  assert.strictEqual(defaultNumber, 1)
  assert.deepStrictEqual(nsNumber, ns)

  assert.deepStrictEqual(defaultObject, { a: "a" })
  assert.strictEqual(aOfObject, "a")

  ns = createNamespace({ a: "a", b: "b", default: "default" })
  assert.strictEqual(aOfExports, "a")
  assert.strictEqual(defaultOfExports, "default")
  assert.deepStrictEqual(nsOfExports, ns)

  ns = createNamespace({ a: "a", default: "default" })
  assert.strictEqual(aOfPseudo, "a")
  assert.strictEqual(defaultPseudo, "default")
  assert.deepStrictEqual(nsPseudo, ns)

  ns = createNamespace({ default: defaultUndefined })
  assert.strictEqual(defaultUndefined, void 0)
  assert.deepStrictEqual(nsUndefined, ns)

  ns = createNamespace({ default: {} })
  assert.deepStrictEqual(nsEmpty, ns)

  ns = createNamespace()
  assert.deepStrictEqual(nsEmptyPseudo, ns)

  const objects = [defaultEmpty, defaultExports]
  objects.forEach((object) => assert.ok(isPlainObject(object)))

  assert.strictEqual(nsSafe.safe, "safe get")
}
