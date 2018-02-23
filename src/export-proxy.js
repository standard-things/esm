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
        unwrap: new WeakMap,
        wrap: new WeakMap
      }

      shared.exportProxy.set(exported, cache)
    }

    const { unwrap, wrap } = cache

    const proxy = new Proxy(exported, {
      __proto__: null,
      get(target, name, receiver) {
        const value = Reflect.get(target, name, receiver)

        if (typeof value !== "function" ||
            ! isNative(value)) {
          return value
        }

        let wrapper = wrap.get(value)

        if (wrapper) {
          return wrapper
        }

        wrapper = function (...args) {
          if (new.target) {
            return Reflect.construct(value, args, new.target)
          }

          let thisArg = this

          if (thisArg === proxy ||
              thisArg === entry.esmNamespace) {
            thisArg = target
          }

          return Reflect.apply(value, thisArg, args)
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

        setProperty(wrapper, "toString", {
          enumerable: false,
          value: GenericFunction.bind(value.toString, value)
        })

        Object.setPrototypeOf(wrapper, value)
        wrapper.prototype = value.prototype

        wrap.set(value, wrapper)
        unwrap.set(wrapper, value)

        return wrapper
      },
      set(target, name, value, receiver) {
        Reflect.set(target, name, unwrap.get(value) || value, receiver)
        entry.update()
        return true
      }
    })

    return proxy
  }
}

Object.setPrototypeOf(ExportProxy.prototype, null)

export default ExportProxy
