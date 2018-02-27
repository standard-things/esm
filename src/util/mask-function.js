import OwnProxy from "../own/proxy.js"

import has from "./has.js"
import isObjectLike from "./is-object-like.js"

function maskFunction(func, source) {
  if (typeof source !== "function") {
    return func
  }

  const proxy = new OwnProxy(func, {
    get(target, name, receiver) {
      if (name === "toString" &&
          ! has(func, "toString")) {
        return toString
      }

      return Reflect.get(target, name, receiver)
    }
  })

  const toString = new OwnProxy(func.toString, {
    apply(target, thisArg, args) {
      if (thisArg === proxy) {
        thisArg = source
      }

      return Reflect.apply(target, thisArg, args)
    }
  })

  const srcProto = source.prototype

  if (isObjectLike(srcProto)) {
    Object.setPrototypeOf(func.prototype, Object.getPrototypeOf(srcProto))
  } else if ("prototype" in func) {
    func.prototype = srcProto
  }

  Object.setPrototypeOf(func, Object.getPrototypeOf(source))

  return proxy
}

export default maskFunction
