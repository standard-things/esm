import getPrototypeOf from "./get-prototype-of.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isModuleNamespaceObjectLike(value) {
    if (! isObject(value) ||
        getPrototypeOf(value) !== null) {
      return false
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(value, Symbol.toStringTag)

    return descriptor !== void 0 &&
      descriptor.configurable === false &&
      descriptor.enumerable === false &&
      descriptor.writable === false &&
      descriptor.value === "Module"
  }

  return isModuleNamespaceObjectLike
}

export default shared.inited
  ? shared.module.utilIsModuleNamespaceObjectLike
  : shared.module.utilIsModuleNamespaceObjectLike = init()
