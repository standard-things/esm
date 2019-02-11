import hoisted, { declaration } from "../fixture/export/default/hoisted.mjs"

import AnonymousClass from "../fixture/export/default/anonymous-class.mjs"
import AnonymousClassParens from "../fixture/export/default/anonymous-class-parens.mjs"
import NamedClass from "../fixture/export/default/class.mjs"
import SemVer from "semver"

import assert from "assert"
import anonymousFunction from "../fixture/export/default/anonymous-function.mjs"
import anonymousFunctionParens from "../fixture/export/default/anonymous-function-parens.mjs"
import anonymousGenerator from "../fixture/export/default/anonymous-generator.mjs"
import anonymousGeneratorParens from "../fixture/export/default/anonymous-generator-parens.mjs"
import array from "../fixture/export/default/array.mjs"
import arrowFunction from "../fixture/export/default/arrow-function.mjs"
import arrowFunctionParens from "../fixture/export/default/arrow-function-parens.mjs"
import expression from "../fixture/export/default/expression.mjs"
import identifier from "../fixture/export/default/identifier.mjs"
import namedFunction from "../fixture/export/default/function.mjs"
import nullValue from "../fixture/export/default/null.mjs"
import number from "../fixture/export/default/number.mjs"
import object from "../fixture/export/default/object.mjs"
import reExport from "../fixture/export/default/re-export.mjs"
import { reExportNamed } from "../fixture/export/default/re-export-named.mjs"
import undefinedValue from "../fixture/export/default/undefined.mjs"

const canGenerateNamesFromVars = SemVer.satisfies(process.version, ">=6.5")
const canTestAsyncFunctions = SemVer.satisfies(process.version, ">=7.6")
const canTestAsyncGenerators = SemVer.satisfies(process.version, ">=10")

export default () => {
  assert.deepStrictEqual(array, ["a"])
  assert.strictEqual(typeof AnonymousClass, "function")
  assert.strictEqual(typeof AnonymousClassParens, "function")
  assert.strictEqual(typeof NamedClass, "function")
  assert.strictEqual(declaration, hoisted)
  assert.strictEqual(expression, 1)
  assert.strictEqual(identifier, 1)
  assert.strictEqual(typeof namedFunction, "function")
  assert.strictEqual(nullValue, null)
  assert.strictEqual(number, 1)
  assert.deepStrictEqual(object, { value: 1 })
  assert.strictEqual(reExport, object)
  assert.strictEqual(reExportNamed, "foo")
  assert.strictEqual(undefinedValue, void 0)

  const anonymousFuncs = [
    anonymousFunction
  ]

  if (canGenerateNamesFromVars) {
    anonymousFuncs.push(
      AnonymousClass,
      AnonymousClassParens,
      anonymousFunctionParens,
      anonymousGenerator,
      anonymousGeneratorParens,
      arrowFunction,
      arrowFunctionParens
    )
  }

  if (canTestAsyncFunctions) {
    anonymousFuncs.push(
      import("../fixture/export/default/anonymous-async-function.mjs"),
      import("../fixture/export/default/anonymous-async-function-parens.mjs"),
      import("../fixture/export/default/async-arrow-function.mjs"),
      import("../fixture/export/default/async-arrow-function-parens.mjs")
    )
  }

  if (canTestAsyncGenerators) {
    anonymousFuncs.push(
      import("../fixture/export/default/anonymous-async-generator.mjs"),
      import("../fixture/export/default/anonymous-async-generator-parens.mjs")
    )
  }

  return Promise
    .all(anonymousFuncs)
    .then((funcs) => {
      for (const func of funcs) {
        const { name } = typeof func === "function" ? func : func.default

        assert.strictEqual(name, "default")
      }
    })
}
