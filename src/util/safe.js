import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"

function safe(Super) {
  if (typeof Super !== "function") {
    return copy({ __proto__: null }, Super)
  }

  const Safe = isObjectLike(Super.prototype)
    ? class extends Super {}
    : (...args) => Reflect.construct(Super, args)

  const names = keysAll(Super)
  const safeProto = Safe.prototype

  for (const name of names) {
    if (name !== "prototype") {
      copyProperty(Safe, Super, name)
    }
  }

  copy(safeProto, Super.prototype)
  Object.setPrototypeOf(safeProto, null)
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
  const descriptor = Object.getOwnPropertyDescriptor(source, key)

  if (descriptor) {
    if (isDataDescriptor(descriptor)) {
      object[key] = source[key]
    } else {
      Object.defineProperty(object, key, descriptor)
    }
  }

  return object
}

function keysAll(object) {
  if (object == null) {
    return []
  }

  const names = Object.getOwnPropertyNames(object)
  names.push(...Object.getOwnPropertySymbols(object))
  return names
}

export default safe
