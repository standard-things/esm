import OwnProxy from "../own/proxy.js"

import emptyArray from "../util/empty-array.js"
import emptyObject from "../util/empty-object.js"
import isOwnProxy from "../util/is-own-proxy.js"
import nativeTrap from "../util/native-trap.js"
import shared from "../shared.js"
import unwrapOwnProxy from "../util/unwrap-own-proxy.js"

function init() {
  const { proxyNativeSourceText } = shared

  const NATIVE_SOURCE_TEXT = proxyNativeSourceText === ""
    ? "function () { [native code] }"
    : proxyNativeSourceText

  const Shim = {
    enable(context) {
      // Avoid a silent fail accessing `context.Function` in Electron 1.
      const FuncProto = Reflect
        .getOwnPropertyDescriptor(context, "Function")
        .value
        .prototype

      const cache = shared.memoize.shimFunctionPrototypeToString

      if (check(FuncProto, cache)) {
        return context
      }

      const apply = nativeTrap((toString, thisArg) => {
        if (proxyNativeSourceText !== "" &&
            isOwnProxy(thisArg)) {
          thisArg = unwrapOwnProxy(thisArg)
        }

        try {
          return Reflect.apply(toString, thisArg, emptyArray)
        } catch (e) {
          if (typeof thisArg !== "function") {
            throw e
          }
        }

        if (isOwnProxy(thisArg)) {
          try {
            return Reflect.apply(toString, unwrapOwnProxy(thisArg), emptyArray)
          } catch {}
        }

        // Section 19.2.3.5: Function.prototype.toString()
        // Step 3: Return "function () { [native code] }" for callable objects.
        // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
        return NATIVE_SOURCE_TEXT
      })

      if (Reflect.defineProperty(FuncProto, "toString", {
            configurable: true,
            value: new OwnProxy(FuncProto.toString, { apply }),
            writable: true
          })) {
        cache.set(FuncProto, true)
      }

      return context
    }
  }

  function check(FuncProto, cache) {
    let cached = cache.get(FuncProto)

    if (cached !== void 0) {
      return cached
    }

    cached = true

    try {
      const { toString } = FuncProto

      if (typeof toString === "function") {
        cached =
          Reflect.apply(toString, new OwnProxy(toString, emptyObject), emptyArray) ===
          Reflect.apply(toString, toString, emptyArray)
      }
    } catch {
      cached = false
    }

    cache.set(FuncProto, cached)

    return cached
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimFunctionPrototypeToString
  : shared.module.shimFunctionPrototypeToString = init()
