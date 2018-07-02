import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isPlainObject(value) {
    if (! isObject(value)) {
      return false
    }

    const proto = Reflect.getPrototypeOf(value)

    let rootProto = null

    if (proto) {
      let nextProto = proto

      do {
        rootProto = nextProto
        nextProto = Reflect.getPrototypeOf(rootProto)
      } while (nextProto !== null)
    }

    return proto === rootProto
  }

  return isPlainObject
}

export default shared.inited
  ? shared.module.utilIsPlainObject
  : shared.module.utilIsPlainObject = init()
