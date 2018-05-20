import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  const { propertyIsEnumerable } = Object.prototype

  function isNamespaceObject(value) {
    return isObject(value) &&
      Reflect.getPrototypeOf(value) === null &&
      value[Symbol.toStringTag] === "Module" &&
      ! propertyIsEnumerable.call(value, Symbol.toStringTag)
  }

  return isNamespaceObject
}

export default shared.inited
  ? shared.module.utilIsNamespaceObject
  : shared.module.utilIsNamespaceObject = init()
