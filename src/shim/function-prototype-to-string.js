import OwnProxy from "../own/proxy.js"

import call from "../util/call.js"
import isOwnProxy from "../util/is-own-proxy.js"
import shared from "../shared.js"
import unwrapProxy from "../util/unwrap-proxy.js"

function init() {
  const NATIVE_SOURCE_TEXT = "function () { [native code] }"

  const Shim = {
    __proto__: null,
    enable(context) {
      const cache = shared.memoize.shimFunctionPrototypeToString

      // Avoid a silent fail accessing `context.Function` in Electron.
      const funcCtor = Function("c", "return c.Function")(context)
      const funcProto = funcCtor.prototype

      if (check(funcProto, cache)) {
        return context
      }

      // Section 19.2.3.5: Function.prototype.toString()
      // Step 3: Return "function () { [native code] }" for callable objects.
      // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
      const _toString = funcProto.toString

      const toString = function () {
        let thisArg = this

        try {
          return call(_toString, thisArg)
        } catch (e) {
          if (typeof thisArg !== "function") {
            throw e
          }
        }

        if (isOwnProxy(thisArg)) {
          thisArg = unwrapProxy(thisArg)
        } else {
          return NATIVE_SOURCE_TEXT
        }

        try {
          return call(_toString, thisArg)
        } catch (e) {}

        return NATIVE_SOURCE_TEXT
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

      result = toString.call(proxy) === toString.call(toString)
    } catch (e) {}

    cache.set(funcProto, result)
    return result
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimFunctionPrototypeToString
  : shared.module.shimFunctionPrototypeToString = init()
