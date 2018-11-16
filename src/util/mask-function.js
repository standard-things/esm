import GenericObject from "../generic/object.js"
import OwnProxy from "../own/proxy.js"
import Package from "../package.js"

import captureStackTrace from "../error/capture-stack-trace.js"
import copyProperty from "./copy-property.js"
import getPrototypeOf from "./get-prototype-of.js"
import has from "./has.js"
import isObjectLike from "./is-object-like.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"
import shimFunctionPrototypeToString from "../shim/function-prototype-to-string.js"
import unwrapProxy from "./unwrap-proxy.js"

function init() {
  function maskFunction(func, source) {
    if (typeof source !== "function") {
      return func
    }

    const cache = shared.memoize.utilMaskFunction

    let cached = cache.get(func)

    if (cached !== void 0) {
      return cached.proxy
    }

    cached = cache.get(source)

    if (cached !== void 0) {
      source = cached.source
    }

    const proxy = new OwnProxy(func, {
      get: function get(target, name, receiver) {
        if (name === "toString" &&
            ! has(target, "toString")) {
          return cached.toString
        }

        if (receiver === proxy) {
          receiver = target
        }

        try {
          return Reflect.get(target, name, receiver)
        } catch (e) {
          throw captureStackTrace(e, get)
        }
      }
    })

    const toString = new OwnProxy(func.toString, {
      apply: function apply(target, thisArg, args) {
        if (! Package.state.default.options.debug &&
            typeof thisArg === "function" &&
            unwrapProxy(thisArg) === func) {
          thisArg = cached.source
        }

        try {
          return Reflect.apply(target, thisArg, args)
        } catch (e) {
          throw captureStackTrace(e, apply)
        }
      }
    })

    copyProperty(func, source, "name")
    setPrototypeOf(func, getPrototypeOf(source))

    const sourceProto = has(source, "prototype") ? source.prototype : void 0

    if (isObjectLike(sourceProto)) {
      let proto = has(func, "prototype") ? func.prototype : void 0

      if (! isObjectLike(proto)) {
        proto =
        func.prototype = GenericObject.create()
      }

      proto.constructor = proxy
      setPrototypeOf(proto, getPrototypeOf(sourceProto))
    } else {
      const descriptor = Reflect.getOwnPropertyDescriptor(source, "prototype")

      if (descriptor === void 0) {
        Reflect.deleteProperty(func, "prototype")
      } else {
        Reflect.defineProperty(func, "prototype", descriptor)
      }
    }

    cached = {
      proxy,
      source,
      toString
    }

    cache
      .set(func, cached)
      .set(proxy, cached)

    return proxy
  }

  shimFunctionPrototypeToString.enable(shared.safeGlobal)

  return maskFunction
}

export default shared.inited
  ? shared.module.utilMaskFunction
  : shared.module.utilMaskFunction = init()
