import apply from "./apply.js"
import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"

const {
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  getOwnPropertySymbols,
  setPrototypeOf
} = Object

const { push } = Array.prototype

const construct = typeof Reflect === "object" && Reflect !== null
  ? Reflect.construct
  : (target, args) => new target(...args)

function safe(Super) {
  if (typeof Super !== "function") {
    return copy({ __proto__: null }, Super)
  }

  const Safe = isObjectLike(Super.prototype)
    ? class extends Super {}
    : (...args) => construct(Super, args)

  const names = keysAll(Super)
  const safeProto = Safe.prototype

  for (const name of names) {
    if (name !== "prototype") {
      copyProperty(Safe, Super, name)
    }
  }

  copy(safeProto, Super.prototype)
  setPrototypeOf(safeProto, null)
  return Safe
}

function copy(object, source) {
  const names = keysAll(source)

  for (const name of names) {
    copyProperty(object, source, name)
  }

  return object
}

function copyProperty(object, source, key) {
  const descriptor = getOwnPropertyDescriptor(source, key)

  if (descriptor) {
    if (isDataDescriptor(descriptor)) {
      object[key] = source[key]
    } else {
      defineProperty(object, key, descriptor)
    }
  }

  return object
}

function keysAll(object) {
  if (object == null) {
    return []
  }

  const names = getOwnPropertyNames(object)
  apply(push, names, getOwnPropertySymbols(object))
  return names
}

export default safe
