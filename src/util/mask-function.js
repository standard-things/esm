import OwnProxy from "../own/proxy.js"

import has from "./has.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"
import unwrapProxy from "./unwrap-proxy.js"

function maskFunction(func, source) {
  if (typeof source !== "function") {
    return func
  }

  const cache = shared.maskFunction
  let cached = cache.get(func)

  if (cached) {
    return cached.proxy
  }

  const proxy = new OwnProxy(func, {
    get(target, name, receiver) {
      if (name === "toString" &&
          ! has(func, "toString")) {
        return cached.toString
      }

      return Reflect.get(target, name, receiver)
    }
  })

  const toString = new OwnProxy(func.toString, {
    apply(target, thisArg, args) {
      if (typeof thisArg === "function" &&
          unwrapProxy(thisArg) === func) {
        thisArg = cached.source
      }

      return Reflect.apply(target, thisArg, args)
    }
  })

  source = cache.get(source) || source

  if (typeof source !== "function") {
    source = source.source
  }

  const sourceProto = source.prototype

  if (isObjectLike(sourceProto)) {
    Reflect.setPrototypeOf(func.prototype, Reflect.getPrototypeOf(sourceProto))
  } else if (Reflect.has(func, "prototype")) {
    func.prototype = sourceProto
  }

  Reflect.setPrototypeOf(func, Reflect.getPrototypeOf(source))

  cached = {
    __proto__: null,
    proxy,
    source,
    toString
  }

  cache
    .set(func, cached)
    .set(proxy, cached)

  return proxy
}

export default maskFunction
