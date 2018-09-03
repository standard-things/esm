import OwnProxy from "../own/proxy.js"

import call from "../util/call.js"
import isOwnProxy from "../util/is-own-proxy.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  const Shim = {
    enable(context) {
      const cache = shared.memoize.shimFunctionPrototypeToString

      // Avoid a silent fail accessing `context.Function` in Electron 1.
      const funcCtor = Function("c", "return c.Function")(context)
      const funcProto = funcCtor.prototype

      if (check(funcProto, cache)) {
        return context
      }

      const _toString = funcProto.toString
      const { proxyNativeSourceText } = shared

      const NATIVE_SOURCE_TEXT =
        proxyNativeSourceText ||
        "function () { [native code] }"

      // Section 19.2.3.5: Function.prototype.toString()
      // Step 3: Return "function () { [native code] }" for callable objects.
      // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
      const toString = function () {
        let thisArg = this

        if (proxyNativeSourceText &&
            isOwnProxy(thisArg)) {
          thisArg = unwrapProxy(thisArg)
        }

        try {
          return call(_toString, thisArg)
        } catch (e) {
          if (typeof thisArg !== "function") {
            throw e
          }
        }

        if (isOwnProxy(thisArg)) {
          try {
            return call(_toString, unwrapProxy(thisArg))
          } catch {}
        }

        return NATIVE_SOURCE_TEXT
      }

      try {
        funcProto.toString = new OwnProxy(_toString, {
          apply(target, thisArg) {
            return call(toString, thisArg)
          }
        })

        cache.set(funcProto, true)
      } catch {}

      return context
    }
  }

  function check(funcProto, cache) {
    let result = cache.get(funcProto)

    if (typeof result === "boolean") {
      return result
    }

    result = true

    try {
      const { toString } = funcProto

      if (typeof toString === "function") {
        const proxy = new OwnProxy(toString, {})

        result = Reflect.apply(toString, proxy, []) === Reflect.apply(toString, toString, [])
      }
    } catch (e) {
      result = false
    }

    cache.set(funcProto, result)
    return result
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimFunctionPrototypeToString
  : shared.module.shimFunctionPrototypeToString = init()
