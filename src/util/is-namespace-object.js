import isEnumerable from "./is-enumerable.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isNamespaceObject(value) {
    return isObject(value) &&
      Reflect.getPrototypeOf(value) === null &&
      value[Symbol.toStringTag] === "Module" &&
      ! isEnumerable(value, Symbol.toStringTag)
  }

  return isNamespaceObject
}

export default shared.inited
  ? shared.module.utilIsNamespaceObject
  : shared.module.utilIsNamespaceObject = init()
