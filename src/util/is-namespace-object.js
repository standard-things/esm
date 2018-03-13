import isObject from "./is-object.js"

const { propertyIsEnumerable } = Object.prototype

function isNamespaceObject(value) {
  return isObject(value) &&
    Reflect.getPrototypeOf(value) === null &&
    value[Symbol.toStringTag] === "Module" &&
    ! propertyIsEnumerable.call(value, Symbol.toStringTag)
}

export default isNamespaceObject
