import assert from "assert"
import createNamespace from "../../create-namespace.js"
import require from "../../require.js"
import util from "util"
import * as ns from "_http_common"

const { types } = util

export default () => {
  const nsObject = createNamespace({
    default: require("_http_common")
  })

  assert.ok(Object.isSealed(ns))
  assert.strictEqual(Object.prototype.toString.call(ns), "[object Module]")
  assert.deepStrictEqual(Reflect.ownKeys(ns), ["default", Symbol.toStringTag])
  assert.deepStrictEqual(ns, nsObject)

  if (types) {
    assert.ok(types.isModuleNamespaceObject(ns))
  } else {
    assert.ok(true)
  }
}
