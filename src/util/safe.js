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
    const SuperProto = Super.prototype

    const Safe = isObjectLike(SuperProto)
      ? class extends Super {}
      : (...args) => Reflect.construct(Super, args)

    const names = ownKeys(Super)

    for (const name of names) {
      if (name !== "prototype") {
        safeCopyProperty(Safe, Super, name)
      }
    }

    const safeProto = Safe.prototype

    safeAssignProperties(safeProto, SuperProto)
    setPrototypeOf(safeProto, null)

    return Safe
  }

  return safe
}

export default shared.inited
  ? shared.module.utilSafe
  : shared.module.utilSafe = init()
