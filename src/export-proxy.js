import GenericFunction from "./generic/function.js"

import errors from "./errors.js"
import isNative from "./util/is-native.js"
import isObjectLike from "./util/is-object-like.js"
import shared from "./shared.js"
import toNullObject from "./util/to-null-object.js"

const defaultOptions = {
  __proto__: null,
  get: Reflect.get,
  set: Reflect.set
}

class ProxyExport {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  constructor(exported, options) {
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

    const { get, set } = ProxyExport.createOptions(options)
    const { proxyValue, realValue } = cache

    const proxy = new Proxy(exported, {
      get(target, name, receiver) {
        const value = get(target, name, receiver)

        if (name in realValue &&
            value === realValue[name]) {
          return proxyValue[name]
        }

        realValue[name] = value

        if (! isNative(value)) {
          return proxyValue[name] = value
        }

        return proxyValue[name] = function (...args) {
          const thisArg = this === proxy ? exported : this
          return GenericFunction.apply(value, thisArg, args)
        }
      },
      set
    })

    return proxy
  }
}

function createOptions(options) {
  return toNullObject(options, ProxyExport.defaultOptions)
}

export default ProxyExport
