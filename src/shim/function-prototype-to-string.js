import OwnProxy from "../own/proxy.js"

import call from "../util/call.js"
import getProxyDetails from "../util/get-proxy-details.js"
import isOwnProxy from "../util/is-own-proxy.js"
import shared from "../shared.js"

function init() {
  const NATIVE_SOURCE_TEXT = "function () { [native code] }"

  const Shim = {
    __proto__: null,
    enable(context) {
      const cache = shared.memoize.shimFunctionPrototypeToString
      const funcProto = context.Function.prototype

      if (check(funcProto, cache)) {
        return context
      }

      // Section 19.2.3.5: Function.prototype.toString()
      // Step 3: Return "function () { [native code] }" for callable objects.
      // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
      const _toString = funcProto.toString

      const toString = function () {
        let thisArg = this

        if (isOwnProxy(thisArg)) {
          const details = getProxyDetails(thisArg)

          if (details) {
            thisArg = details[0]
          } else {
            return NATIVE_SOURCE_TEXT
          }
        }

        return call(_toString, thisArg)
      }

      try {
        funcProto.toString = new OwnProxy(_toString, {
          apply(target, thisArg) {
            return call(toString, thisArg)
          }
        })

        cache.set(funcProto, true)
      } catch (e) {}

      return context
    }
  }

  function check(funcProto, cache) {
    let result = cache.get(funcProto)

    if (typeof result === "boolean") {
      return result
    }

    result = false

    try {
      const { toString } = funcProto
      const proxy = new OwnProxy(toString)

      result = typeof toString.call(proxy) === "string"
    } catch (e) {}

    cache.set(funcProto, result)
    return result
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimFunctionPrototypeToString
  : shared.module.shimFunctionPrototypeToString = init()
