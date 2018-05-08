import isObject from "./is-object.js"

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

export default isPlainObject
