import OwnProxy from "../own/proxy.js"
import SafeObject from "../safe/object.js"

import has from "./has.js"
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
      // Wrap native functions to avoid illegal invocation type errors in V8.
      // https://bugs.chromium.org/p/v8/issues/detail?id=5773
      if (! isNative(value)) {
        return value
      }

      let wrapper = cached.wrap.get(value)

      if (wrapper) {
        return wrapper
      }

      wrapper = new OwnProxy(value, {
        apply(funcTarget, thisArg, args) {
          if (thisArg === proxy) {
            thisArg = target
          }

          return Reflect.apply(value, thisArg, args)
        }
      })

      cached.wrap.set(value, wrapper)
      cached.unwrap.set(wrapper, value)

      return wrapper
    }

    // Once V8 issue #5773 is fixed, the `getOwnPropertyDescriptor` trap can be
    // removed and the `get` trap can be conditionally dropped for `exported`
    // values that return "[object Function]" or "[object Object]" from
    // `Object.prototype.toString.call(exported)`.
    const proxy = new OwnProxy(exported, {
      defineProperty(target, name, descriptor) {
        if (has(descriptor, "value")) {
          const { value } = descriptor

          if (typeof value === "function") {
            descriptor.value = cached.unwrap.get(value) || value
          }
        }

        // Use `Object.defineProperty` instead of `Reflect.defineProperty` to
        // throw the appropriate error if something goes wrong.
        // https://tc39.github.io/ecma262/#sec-definepropertyorthrow
        SafeObject.defineProperty(target, name, descriptor)
        entry.update()
        return true
      },
      deleteProperty(target, name) {
        if (Reflect.deleteProperty(target, name)) {
          entry.update()
          return true
        }

        return false
      },
      get(target, name, receiver) {
        const value = Reflect.get(target, name, receiver)

        // Produce a `Symbol.toStringTag` value, otherwise
        // `Object.prototype.toString.call(proxy)` will return
        // "[object Function]", if `proxy` is a function, else "[object Object]".
        if (name === Symbol.toStringTag &&
            typeof target !== "function" &&
            typeof value !== "string") {
          // Section 19.1.3.6: Object.prototype.toString()
          // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
          // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
          const toStringTag = toString.call(target).slice(8, -1)

          return toStringTag === "Object" ? value : toStringTag
        }

        return maybeWrap(target, name, value)
      },
      getOwnPropertyDescriptor(target, name) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (has(descriptor, "value")) {
          const { value } = descriptor

          if (typeof value === "function") {
            descriptor.value = maybeWrap(target, name, value)
          }
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
