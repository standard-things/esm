import OwnProxy from "./own/proxy.js"

import errors from "./errors.js"
import isNative from "./util/is-native.js"
import isObjectLike from "./util/is-object-like.js"
import shared from "./shared.js"

const { toString } = Object.prototype

class ExportProxy {
  constructor(entry) {
    const exported = entry.module.exports

    // Avoid using buggy proxies in Chakra.
    if (! shared.support.proxiedFunctions) {
      return exported
    }

    if (! isObjectLike(exported)) {
      throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "exported", "object")
    }

    const cache = shared.exportProxy
    let cached = cache.get(exported)

    if (cached) {
      return cached.proxy
    }

    const maybeWrap = (target, name, value) => {
      if (name === Symbol.toStringTag &&
          typeof value !== "string") {
        value = toString.call(target).slice(8, -1)
      }

      if (typeof value !== "function" ||
          ! isNative(value)) {
        return value
      }

      let wrapper = cached.wrap.get(value)

      if (wrapper) {
        return wrapper
      }

      wrapper = new OwnProxy(value, {
        apply(funcTarget, thisArg, args) {
          if (thisArg === proxy ||
              thisArg === entry.esmNamespace) {
            thisArg = target
          }

          return Reflect.apply(value, thisArg, args)
        }
      })

      cached.wrap.set(value, wrapper)
      cached.unwrap.set(wrapper, value)

      return wrapper
    }

    const proxy = new OwnProxy(exported, {
      get(target, name, receiver) {
        return maybeWrap(target, name, Reflect.get(target, name, receiver))
      },
      getOwnPropertyDescriptor(target, name) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor &&
            "value" in descriptor) {
          descriptor.value = maybeWrap(target, name, descriptor.value)
        }

        return descriptor
      },
      set(target, name, value, receiver) {
        Reflect.set(target, name, cached.unwrap.get(value) || value, receiver)
        entry.update()
        return true
      }
    })

    cached = {
      __proto__: null,
      proxy,
      unwrap: new WeakMap,
      wrap: new WeakMap
    }

    cache
      .set(exported, cached)
      .set(proxy, cached)

    return proxy
  }
}

Object.setPrototypeOf(ExportProxy.prototype, null)

export default ExportProxy
