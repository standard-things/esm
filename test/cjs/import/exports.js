import assert from "assert"
import createNamespace from "../../create-namespace.js"
import isPlainObject from "../../is-plain-object.js"
import defaultArray, * as nsArray from "../../fixture/cjs/export/array.js"
import defaultClass, * as nsClass from "../../fixture/cjs/export/class.js"
import defaultDefault, * as nsDefault from "../../fixture/cjs/export/default.js"
import defaultEmpty, * as nsEmpty from "../../fixture/cjs/export/empty.js"
import defaultFunction, { a as aOfFunction } from "../../fixture/cjs/export/function.js"
import defaultNull, * as nsNull from "../../fixture/cjs/export/null.js"
import defaultNumber, * as nsNumber from "../../fixture/cjs/export/number.js"
import defaultObject, { a as aOfObject } from "../../fixture/cjs/export/object.js"
import defaultPseudo, { a as aOfPseudo } from "../../fixture/cjs/export/pseudo.js"
import defaultUndefined, * as nsUndefined from "../../fixture/cjs/export/undefined.js"
import * as nsFunction from "../../fixture/cjs/export/function.js"
import * as nsGetSet from "../../fixture/cjs/export/get-set.js"
import * as nsPseudo from "../../fixture/cjs/export/pseudo.js"
import * as nsPseudoEmpty from "../../fixture/cjs/export/pseudo-empty.js"

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

  ns = createNamespace({ a: "a", default: "default" })
  assert.strictEqual(aOfPseudo, "a")

  assert.strictEqual(defaultPseudo, "default")
  assert.deepStrictEqual(nsPseudo, ns)

  ns = createNamespace({ default: defaultUndefined })
  assert.strictEqual(defaultUndefined, void 0)
  assert.deepStrictEqual(nsUndefined, ns)

  ns = createNamespace({ default: {} })
  assert.deepStrictEqual(nsEmpty, ns)

  ns = createNamespace({})
  assert.deepStrictEqual(nsPseudoEmpty, ns)

  assert.ok(isPlainObject(defaultEmpty))
  assert.strictEqual(nsGetSet.safe, "safe get")
}
