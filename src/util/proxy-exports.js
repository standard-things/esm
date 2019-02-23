import OwnProxy from "../own/proxy.js"
import SafeObject from "../safe/object.js"

import getGetter from "./get-getter.js"
import getObjectTag from "./get-object-tag.js"
import getSetter from "./get-setter.js"
import isAnyArrayBuffer from "./is-any-array-buffer.js"
import isDate from "./is-date.js"
import isExternal from "./is-external.js"
import isMap from "./is-map.js"
import isMapIterator from "./is-map-iterator.js"
import isNative from "./is-native.js"
import isNumberObject from "./is-number-object.js"
import isObject from "./is-object.js"
import isObjectLike from "./is-object-like.js"
import isPlainObject from "./is-plain-object.js"
import isRegExp from "./is-regexp.js"
import isSet from "./is-set.js"
import isSetIterator from "./is-set-iterator.js"
import isStringObject from "./is-string-object.js"
import isWeakMap from "./is-weak-map.js"
import isWeakSet from "./is-weak-set.js"
import isWebAssemblyCompiledModule from "./is-web-assembly-compiled-module.js"
import isUpdatableDescriptor from "./is-updatable-descriptor.js"
import isUpdatableGet from "./is-updatable-get.js"
import isUpdatableSet from "./is-updatable-set.js"
import keys from "./keys.js"
import nativeTrap from "./native-trap.js"
import shared from "../shared.js"

function init() {
  function proxyExports(entry) {
    const exported = entry.module.exports

    if (! isObjectLike(exported)) {
      return exported
    }

    const cache = shared.memoize.utilProxyExports

    let cached = cache.get(exported)

    if (cached !== void 0) {
      return cached.proxy
    }

    const get = (exported, name, receiver) => {
      if (receiver === proxy) {
        receiver = exported
      }

      const hasGetter = getGetter(exported, name) !== void 0
      const value = Reflect.get(exported, name, receiver)

      if (hasGetter) {
        tryUpdateBindings(name, value)
      }

      return value
    }

    const maybeWrap = (exported, func) => {
      // Wrap native methods to avoid throwing illegal invocation or
      // incompatible receiver type errors.
      if (! isNative(func)) {
        return func
      }

      let wrapper = cached.wrap.get(func)

      if (wrapper !== void 0) {
        return wrapper
      }

      wrapper = new OwnProxy(func, {
        apply: nativeTrap((func, thisArg, args) => {
          // Check for `entry.completeNamespace` because it's a proxy that
          // native methods could be invoked on.
          if (thisArg === proxy ||
              thisArg === entry.completeMutableNamespace ||
              thisArg === entry.completeNamespace) {
            thisArg = exported
          }

          return Reflect.apply(func, thisArg, args)
        })
      })

      cached.wrap.set(func, wrapper)
      cached.unwrap.set(wrapper, func)

      return wrapper
    }

    const tryUpdateBindings = (name, value) => {
      if (! Reflect.has(entry.getters, name)) {
        entry.updateBindings()
        return
      }

      const { getters } = entry
      const getter = getters[name]

      entry.addGetter(name, () => value)

      try {
        entry.updateBindings(name)
      } finally {
        if (typeof getter === "function") {
          getters[name] = getter
        } else {
          Reflect.deleteProperty(getters, name)
        }
      }
    }

    const handler = {
      defineProperty(exported, name, descriptor) {
        const { value } = descriptor

        if (typeof value === "function") {
          const unwrapped = cached.unwrap.get(value)

          descriptor.value = unwrapped === void 0 ? value : unwrapped
        }

        // Use `Object.defineProperty` instead of `Reflect.defineProperty` to
        // throw the appropriate error if something goes wrong.
        // https://tc39.github.io/ecma262/#sec-definepropertyorthrow
        SafeObject.defineProperty(exported, name, descriptor)

        if (typeof descriptor.get === "function" &&
            typeof handler.get !== "function") {
          handler.get = get
        }

        if (Reflect.has(entry.getters, name)) {
          entry.addGetter(name, () => entry.exports[name])
          entry.updateBindings(name)
        }

        return true
      },
      deleteProperty(exported, name) {
        if (Reflect.deleteProperty(exported, name)) {
          if (Reflect.has(entry.getters, name)) {
            entry.addGetter(name, () => entry.exports[name])
            entry.updateBindings(name)
          }

          return true
        }

        return false
      },
      set(exported, name, value, receiver) {
        if (! isUpdatableSet(exported, name)) {
          return false
        }

        const unwrapped = typeof value === "function"
          ? cached.unwrap.get(value)
          : void 0

        if (unwrapped !== void 0) {
          value = unwrapped
        }

        if (receiver === proxy) {
          receiver = exported
        }

        const hasSetter = getSetter(exported, name) !== void 0

        if (Reflect.set(exported, name, value, receiver)) {
          if (Reflect.has(entry.getters, name)) {
            entry.addGetter(name, () => entry.exports[name])
            entry.updateBindings(hasSetter ? void 0 : name)
          } else if (hasSetter) {
            entry.updateBindings()
          }

          return true
        }

        return false
      }
    }

    const { builtin } = entry
    const names = builtin ? null : keys(exported)

    for (const name of names) {
      if (typeof Reflect.getOwnPropertyDescriptor(exported, name).get === "function") {
        handler.get = get
        break
      }
    }

    let useWrappers = ! shared.support.nativeProxyReceiver

    if (! builtin &&
        ! useWrappers) {
      if (typeof exported === "function") {
        useWrappers = isNative(exported)
      } else if (! isPlainObject(exported)) {
        useWrappers =
          isMap(exported) ||
          isSet(exported) ||
          isWeakMap(exported) ||
          isWeakSet(exported) ||
          isDate(exported) ||
          isRegExp(exported) ||
          ArrayBuffer.isView(exported) ||
          isAnyArrayBuffer(exported) ||
          isNumberObject(exported) ||
          isStringObject(exported) ||
          isMapIterator(exported) ||
          isSetIterator(exported) ||
          isWebAssemblyCompiledModule(exported) ||
          isExternal(exported)
      }
    }

    if (useWrappers) {
      handler.get = (exported, name, receiver) => {
        if (receiver === proxy) {
          receiver = exported
        }

        const value = get(exported, name, receiver)

        let newValue = value

        // Produce a `Symbol.toStringTag` value, otherwise
        // `getObjectTag(proxy)` will return "[object Function]",
        // if `proxy` is a function, else "[object Object]".
        if (name === Symbol.toStringTag) {
          newValue = getToStringTag(exported, value)
        }

        newValue = maybeWrap(exported, newValue)

        if (newValue !== value &&
            isUpdatableGet(exported, name)) {
          return newValue
        }

        return value
      }

      handler.getOwnPropertyDescriptor = (exported, name) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(exported, name)

        if (isUpdatableDescriptor(descriptor)) {
          const { value } = descriptor

          if (typeof value === "function") {
            descriptor.value = maybeWrap(exported, value)
          }
        }

        return descriptor
      }
    } else if (builtin &&
               isObject(exported) &&
               ! Reflect.has(exported, Symbol.toStringTag) &&
               getObjectTag(exported) !== "[object Object]") {
      handler.get = (exported, name, receiver) => {
        if (receiver === proxy) {
          receiver = exported
        }

        const value = Reflect.get(exported, name, receiver)

        if (name === Symbol.toStringTag) {
          const newValue = getToStringTag(exported, value)

          if (newValue !== value &&
              isUpdatableGet(exported, name)) {
            return newValue
          }
        }

        return value
      }
    }

    // Once V8 issue #5773 is fixed, the `getOwnPropertyDescriptor()` trap can be
    // removed and the `get()` trap can be conditionally dropped for `exported`
    // values that return "[object Function]" or "[object Object]" from
    // `getObjectTag(exported)`.
    const proxy = new OwnProxy(exported, handler)

    cached = {
      proxy,
      unwrap: new WeakMap,
      wrap: new WeakMap
    }

    cache.set(exported, cached)
    cache.set(proxy, cached)

    return proxy
  }

  function getToStringTag(exported, value) {
    if (typeof exported !== "function" &&
        typeof value !== "string") {
      // Section 19.1.3.6: Object.prototype.toString()
      // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
      // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
      const toStringTag = getObjectTag(exported).slice(8, -1)

      return toStringTag === "Object" ? value : toStringTag
    }

    return value
  }

  return proxyExports
}

export default shared.inited
  ? shared.module.utilProxyExports
  : shared.module.utilProxyExports = init()
