import GenericFunction from "./generic/function.js"

import errors from "./errors.js"
import isNative from "./util/is-native.js"
import isObjectLike from "./util/is-object-like.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"

class ExportProxy {
  constructor(entry) {
    const exported = entry.module.exports

    if (! isObjectLike(exported)) {
      throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "exported", "object")
    }

    let cache = shared.exportProxy.get(exported)

    if (! cache) {
      cache = {
        __proto__: null,
        proxyValue: { __proto__: null },
        realValue: { __proto__: null }
      }

      shared.exportProxy.set(exported, cache)
    }

    const { proxyValue, realValue } = cache

    const proxy = new Proxy(exported, {
      get(target, name, receiver) {
        const value = Reflect.get(target, name, receiver)

        if (name in realValue &&
            value === realValue[name]) {
          return proxyValue[name]
        }

        realValue[name] = value

        if (! isNative(value)) {
          return proxyValue[name] = value
        }

        const wrapper = function (...args) {
          if (new.target) {
            return Reflect.construct(value, args, new.target)
          }

          let thisArg = this

          if (thisArg === proxy ||
              thisArg === entry.esmNamespace) {
            thisArg = target
          }

          return GenericFunction.apply(value, thisArg, args)
        }

        setProperty(wrapper, "length", {
          enumerable: false,
          value: value.length,
          writable: false
        })

        setProperty(wrapper, "name", {
          enumerable: false,
          value: value.name,
          writable: false
        })

        Object.setPrototypeOf(wrapper, value)
        wrapper.prototype = value.prototype

        return proxyValue[name] = wrapper
      },
      set(target, name, value, receiver) {
        Reflect.set(target, name, value, receiver)
        entry.update()
        return true
      }
    })

    return proxy
  }
}

export default ExportProxy
