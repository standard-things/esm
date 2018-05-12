import assert from "assert"
import createNamespace from "../../create-namespace.js"
import require from "../../require.js"
import util from "util"
import * as ns from "_http_common"

export default () => {
  const http = require("_http_common")
  const httpNs = createNamespace(Object.assign({}, http, { default: http }))

  assert.ok(Object.isSealed(ns))
  assert.strictEqual(Object.prototype.toString.call(ns), "[object Module]")
  assert.deepStrictEqual(Object.getOwnPropertySymbols(ns), [Symbol.toStringTag])
  assert.deepStrictEqual(ns, httpNs)

  const { types } = util

  if (types) {
    assert.ok(types.isModuleNamespaceObject(ns))
  } else {
    assert.ok(true)
  }
}
