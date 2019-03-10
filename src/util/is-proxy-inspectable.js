import builtinEntries from "../builtin-entries.js"
import getObjectTag from "./get-object-tag.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function isProxyInspectable(value) {
    if (! isObjectLike(value)) {
      return false
    }

    return typeof value === "function" ||
           Array.isArray(value) ||
           Reflect.has(value, Symbol.toStringTag) ||
           value === builtinEntries.process.module.exports ||
           getObjectTag(value) === "[object Object]"
  }

  return isProxyInspectable
}

export default shared.inited
  ? shared.module.utilIsProxyInspectable
  : shared.module.utilIsProxyInspectable = init()
