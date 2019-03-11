import isObjectLike from "./is-object-like.js"
import ownKeys from "./own-keys.js"
import safeAssignProperties from "./safe-assign-properties.js"
import safeCopyProperty from "./safe-copy-property.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  function safe(value) {
    if (typeof value !== "function") {
      if (Array.isArray(value)) {
        return Array.from(value)
      }

      return isObjectLike(value)
        ? safeAssignProperties({}, value)
        : value
    }

    const Super = value

    const Safe = function (...args) {
      const result = Reflect.construct(Super, args)

      setPrototypeOf(result, SafeProto)

      return result
    }

    const SuperNames = ownKeys(Super)

    for (const name of SuperNames) {
      if (name !== "prototype") {
        safeCopyProperty(Safe, Super, name)
      }
    }

    const SafeProto = Safe.prototype

    safeAssignProperties(SafeProto, Super.prototype)
    setPrototypeOf(SafeProto, null)

    return Safe
  }

  return safe
}

export default shared.inited
  ? shared.module.utilSafe
  : shared.module.utilSafe = init()
