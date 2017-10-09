import assert from "assert"
import createNamespace from "../../create-namespace.js"
import require from "../../require.js"
import * as ns from "_http_common"

const toStringTag = Symbol.toStringTag

const useToStringTag = typeof toStringTag === "symbol"

export default () => {
  const nsObject = createNamespace({ default: require("_http_common") })
  const nsSymbols = useToStringTag ? [toStringTag] : []
  const nsTag = useToStringTag ? "[object Module]" : "[object Object]"

  assert.ok(Object.isSealed(ns))
  assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
  assert.deepStrictEqual(Object.getOwnPropertySymbols(ns), nsSymbols)
  assert.deepStrictEqual(Object.getOwnPropertyNames(ns), ["default"])
  assert.deepStrictEqual(ns, nsObject)
}
