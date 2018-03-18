import OwnProxy from "../own/proxy.js"

import call from "../util/call.js"
import getProxyDetails from "../util/get-proxy-details.js"
import isOwnProxy from "../util/is-own-proxy.js"
import shared from "../shared.js"

const nativeSourceText = "function () { [native code] }"

const Shim = {
  __proto__: null,
  check(context) {
    const cache = shared.memoize.functionPrototypeToString
    const funcProto = context.Function.prototype

    let result = cache.get(funcProto)

    if (typeof result !== "boolean") {
      result = false

      try {
        const { toString } = funcProto
        const proxy = new OwnProxy(toString)

        result = typeof toString.call(proxy) === "string"
      } catch (e) {}

      cache.set(funcProto, result)
    }

    return result
  },
  enable(context) {
    if (Shim.check(context)) {
      return context
    }

    // Section 19.2.3.5: Function.prototype.toString()
    // Step 3: Return "function () { [native code] }" for callable objects.
    // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
    const cache = shared.memoize.functionPrototypeToString
    const funcProto = context.Function.prototype
    const _toString = funcProto.toString

    const toString = function () {
      let thisArg = this

      if (thisArg === toString) {
        thisArg = _toString
      } else if (isOwnProxy(thisArg)) {
        const details = getProxyDetails(thisArg)

        if (details) {
          thisArg = details[0]
        } else {
          return nativeSourceText
        }
      }

      return call(_toString, thisArg)
    }

    toString.prototype = void 0
    Reflect.setPrototypeOf(toString, funcProto)

    try {
      if (! shared.support.proxiedFunctions) {
        funcProto.toString = toString
        return
      }

      funcProto.toString = new OwnProxy(_toString, {
        apply(target, thisArg, args) {
          return Reflect.apply(toString, thisArg, args)
        },
        construct(target, args) {
          return Reflect.construct(toString, args)
        }
      })

      cache.set(funcProto, true)
    } catch (e) {}

    return context
  }
}

export default Shim
