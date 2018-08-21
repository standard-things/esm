import getPrototypeOf from "./get-prototype-of.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isPlainObject(value) {
    if (! isObject(value)) {
      return false
    }

    const proto = getPrototypeOf(value)

    let nextProto = proto
    let rootProto = null

    while (nextProto) {
      rootProto = nextProto
      nextProto = getPrototypeOf(rootProto)
    }

    return proto === rootProto
  }

  return isPlainObject
}

export default shared.inited
  ? shared.module.utilIsPlainObject
  : shared.module.utilIsPlainObject = init()
