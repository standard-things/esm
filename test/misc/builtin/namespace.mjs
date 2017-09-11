import assert from "assert"
import * as ns from "_http_common"

const useToStringTag = typeof Symbol.toStringTag === "symbol"

export default function () {
  const nsSymbols = useToStringTag ? [Symbol.toStringTag] : []
  const nsTag = useToStringTag ? "[object Module]" : "[object Object]"

  assert.ok(Object.isSealed(ns))
  assert.deepEqual(Object.getOwnPropertySymbols(ns), nsSymbols)
  assert.strictEqual(Object.prototype.toString.call(ns), nsTag)
  assert.deepEqual(Object.getOwnPropertyNames(ns), ["default"])
}
