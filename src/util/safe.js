import allKeys from "./all-keys.js"
import isObject from "./is-object.js"
import safeAssignPropertiesIn from "./safe-assign-properties-in.js"
import safeCopyProperty from "./safe-copy-property.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  function safe(value) {
    if (typeof value !== "function") {
      if (Array.isArray(value)) {
        return Array.from(value)
      }

      return isObject(value)
        ? safeAssignPropertiesIn({}, value)
        : value
    }

    const Super = value

    const Safe = function (...args) {
      const result = Reflect.construct(Super, args)

      setPrototypeOf(result, SafeProto)

      return result
    }

    const SuperNames = allKeys(Super)

    for (const name of SuperNames) {
      if (name !== "prototype") {
        safeCopyProperty(Safe, Super, name)
      }
    }

    const SafeProto = Safe.prototype

    setPrototypeOf(SafeProto, null)
    safeAssignPropertiesIn(SafeProto, Super.prototype)

    return Safe
  }

  return safe
}

export default shared.inited
  ? shared.module.utilSafe
  : shared.module.utilSafe = init()
