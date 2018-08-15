import ENV from "../constant/env.js"

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
import shared from "../shared.js"

function init() {
  const {
    CHAKRA
  } = ENV

  function getToStringTag(target, value) {
    if (typeof target !== "function" &&
        typeof value !== "string") {
      // Section 19.1.3.6: Object.prototype.toString()
      // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
      // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
      const toStringTag = getObjectTag(target).slice(8, -1)

      return toStringTag === "Object" ? value : toStringTag
    }

    return value
  }

  function proxyExports(entry) {
    const exported = entry.exports

    if (CHAKRA ||
        ! isObjectLike(exported)) {
      return exported
    }

    const cache = shared.memoize.utilProxyExports

    let cached = cache.get(exported)

    if (cached) {
      return cached.proxy
    }

    const get = (target, name, receiver) => {
      if (receiver === proxy) {
        receiver = target
      }

      const accessor = getGetter(target, name)
      const value = Reflect.get(target, name, receiver)

      if (accessor) {
        tryUpdateBindings(name, value)
      }

      return value
    }

    const maybeWrap = (target, name, value) => {
      // Wrap native methods to avoid throwing illegal invocation or
      // incompatible receiver type errors.
      if (! isNative(value)) {
        return value
      }

      let wrapper = cached.wrap.get(value)

      if (wrapper) {
        return wrapper
      }

      wrapper = new OwnProxy(value, {
        apply(funcTarget, thisArg, args) {
          // Check for `entry.esmNamespace` because it's a proxy that native
          // methods could be invoked on.
          if (thisArg === proxy ||
              thisArg === entry.esmMutableNamespace ||
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

    const tryUpdateBindings = (name, value) => {
      if (! Reflect.has(entry._namespace, name)) {
        entry.updateBindings()
        return
      }

      const { getters } = entry
      const getter = getters[name]

      entry.addGetter(name, () => value)

      try {
        entry.updateBindings(name)
      } finally {
        if (getter) {
          getters[name] = getter
        } else {
          Reflect.deleteProperty(getters, name)
        }
      }
    }

    const handler = {
      defineProperty(target, name, descriptor) {
        const { value } = descriptor

        if (typeof value === "function") {
          descriptor.value = cached.unwrap.get(value) || value
        }

        // Use `Object.defineProperty` instead of `Reflect.defineProperty` to
        // throw the appropriate error if something goes wrong.
        // https://tc39.github.io/ecma262/#sec-definepropertyorthrow
        SafeObject.defineProperty(target, name, descriptor)

        if (descriptor.get &&
            ! handler.get) {
          handler.get = get
        }

        if (Reflect.has(entry._namespace, name)) {
          entry.updateBindings(name)
        }

        return true
      },
      deleteProperty(target, name) {
        if (Reflect.deleteProperty(target, name)) {
          if (Reflect.has(entry._namespace, name)) {
            entry.updateBindings(name)
          }

          return true
        }

        return false
      },
      set(target, name, value, receiver) {
        if (typeof value === "function") {
          const newValue = cached.unwrap.get(value) || value

          if (newValue !== value &&
              isUpdatableSet(target, name)) {
            value = newValue
          }
        }

        if (receiver === proxy) {
          receiver = target
        }

        const accessor = getSetter(target, name)

        if (Reflect.set(target, name, value, receiver)) {
          if (accessor) {
            entry.updateBindings()
          } else if (Reflect.has(entry._namespace, name)) {
            entry.updateBindings(name)
          }

          return true
        }

        return false
      }
    }

    const { builtin } = entry
    const names = builtin ? null : keys(exported)

    for (const name of names) {
      const descriptor = Reflect.getOwnPropertyDescriptor(exported, name)

      if (descriptor &&
          descriptor.get) {
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
      handler.get = (target, name, receiver) => {
        const value = get(target, name, receiver)

        let newValue = value

        // Produce a `Symbol.toStringTag` value, otherwise
        // `getObjectTag(proxy)` will return "[object Function]",
        // if `proxy` is a function, else "[object Object]".
        if (name === Symbol.toStringTag) {
          newValue = getToStringTag(target, value)
        }

        newValue = maybeWrap(target, name, newValue)

        if (newValue !== value &&
            isUpdatableGet(target, name)) {
          return newValue
        }

        return value
      }

      handler.getOwnPropertyDescriptor = (target, name) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (isUpdatableDescriptor(descriptor)) {
          const { value } = descriptor

          if (typeof value === "function") {
            descriptor.value = maybeWrap(target, name, value)
          }
        }

        return descriptor
      }
    } else if (builtin &&
        typeof exported !== "function" &&
        ! Reflect.has(exported, Symbol.toStringTag) &&
        getObjectTag(exported) !== "[object Object]") {
      handler.get = (target, name, receiver) => {
        if (receiver === proxy) {
          receiver = target
        }

        const value = Reflect.get(target, name, receiver)

        if (name === Symbol.toStringTag) {
          const newValue = getToStringTag(target, value)

          if (newValue !== value &&
              isUpdatableGet(target, name)) {
            return newValue
          }
        }

        return value
      }
    }

    // Once V8 issue #5773 is fixed, the `getOwnPropertyDescriptor` trap can be
    // removed and the `get` trap can be conditionally dropped for `exported`
    // values that return "[object Function]" or "[object Object]" from
    // `getObjectTag(exported)`.
    const proxy = new OwnProxy(exported, handler)

    cached = {
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
