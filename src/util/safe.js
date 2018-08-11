import isObjectLike from "./is-object-like.js"
import keysAll from "./keys-all.js"
import safeAssignProperties from "./safe-assign-properties.js"
import safeCopyProperty from "./safe-copy-property.js"
import shared from "../shared.js"

function init() {
  function safe(Super) {
    if (typeof Super !== "function") {
      if (Array.isArray(Super)) {
        return Array.from(Super)
      }

      if (isObjectLike(Super)) {
        return safeAssignProperties({}, Super)
      }

      return Super
    }

    const Safe = isObjectLike(Super.prototype)
      ? class extends Super {}
      : (...args) => Reflect.construct(Super, args)

    const names = keysAll(Super)
    const safeProto = Safe.prototype

    for (const name of names) {
      if (name !== "prototype") {
        safeCopyProperty(Safe, Super, name)
      }
    }

    safeAssignProperties(safeProto, Super.prototype)
    Reflect.setPrototypeOf(safeProto, null)

    return Safe
  }

  return safe
}

export default shared.inited
  ? shared.module.utilSafe
  : shared.module.utilSafe = init()
