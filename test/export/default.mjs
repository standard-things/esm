import AnonymousClass from "../fixture/export/default/anonymous-class.mjs"
import NamedClass from "../fixture/export/default/class.mjs"

import assert from "assert"
import anonymousFunction from "../fixture/export/default/anonymous-function.mjs"
import array from "../fixture/export/default/array.mjs"
import expression from "../fixture/export/default/expression.mjs"
import identifier from "../fixture/export/default/identifier.mjs"
import namedFunction from "../fixture/export/default/function.mjs"
import nullValue from "../fixture/export/default/null.mjs"
import number from "../fixture/export/default/number.mjs"
import object from "../fixture/export/default/object.mjs"
import reExport from "../fixture/export/default/re-export.mjs"
import undefinedValue from "../fixture/export/default/undefined.mjs"

export default () => {
  assert.deepStrictEqual(array, ["a"])
  assert.strictEqual(new AnonymousClass(1).value, 1)
  assert.strictEqual(new NamedClass(2).value, 2)
  assert.strictEqual(expression, 1)
  assert.strictEqual(anonymousFunction(1), 1)
  assert.strictEqual(namedFunction(2), 2)
  assert.strictEqual(identifier, 1)
  assert.strictEqual(nullValue, null)
  assert.strictEqual(number, 1)
  assert.deepStrictEqual(object, { value: 1 })
  assert.strictEqual(reExport, object)
  assert.strictEqual(undefinedValue, void 0)
}
