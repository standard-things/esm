import OwnProxy from "../own/proxy.js"

import isNative from "./is-native.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  const { toString } = Object.prototype

  function proxyExports(entry) {
    const exported = entry.module.exports

    if (! shared.support.proxiedClasses ||
        ! isObjectLike(exported)) {
      return exported
    }

    const cache = shared.memoize.utilProxyExports

    let cached = cache.get(exported)

    if (cached) {
      return cached.proxy
    }

    const maybeWrap = (target, name, value) => {
      if (name === Symbol.toStringTag &&
          typeof value !== "string") {
        const toStringTag = toString.call(target).slice(8, -1)

        if (toStringTag !== "Object") {
          value = toStringTag
        }
      }

      if (! isNative(value)) {
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
      defineProperty(target, name, descriptor) {
        if (Reflect.defineProperty(target, name, descriptor)) {
          entry.update()
          return true
        }

        return false
      },
      deleteProperty(target, name) {
        if (Reflect.deleteProperty(target, name)) {
          entry.update()
          return true
        }

        return false
      },
      get(target, name, receiver) {
        return maybeWrap(target, name, Reflect.get(target, name, receiver))
      },
      getOwnPropertyDescriptor(target, name) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor &&
            Reflect.has(descriptor, "value")) {
          descriptor.value = maybeWrap(target, name, descriptor.value)
        }

        return descriptor
      },
      set(target, name, value, receiver) {
        if (typeof value === "function") {
          value = cached.unwrap.get(value) || value
        }

        if (Reflect.set(target, name, value, receiver)) {
          entry.update()
          return true
        }

        return false
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

  return proxyExports
}

export default shared.inited
  ? shared.module.utilProxyExports
  : shared.module.utilProxyExports = init()
