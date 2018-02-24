import OwnProxy from "../own/proxy.js"

import call from "../util/call.js"
import isOwnProxy from "../util/is-own-proxy.js"
import noop from "../util/noop.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

const checked =
  shared.shim.functionPrototypeToString ||
  (shared.shim.functionPrototypeToString = new WeakMap)

const nativeSourceText = "function () { [native code] }"

const Shim = {
  __proto__: null,
  check(context) {
    const funcProto = context.Function.prototype
    let result = checked.get(funcProto)

    if (typeof result !== "boolean") {
      result = false

      try {
        const { toString } = funcProto
        const proxy = new OwnProxy(toString, { __proto__: null })

        result = typeof toString.call(proxy) === "string"
      } catch (e) {}

      checked.set(funcProto, result)
    }

    return result
  },
  enable(context) {
    if (Shim.check(context)) {
      return
    }

    // Section 19.2.3.5: Function.prototype.toString()
    // Step 3: Return "function () { [native code] }" for callable objects.
    // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
    const funcProto = context.Function.prototype
    const _toString = funcProto.toString

    const toString = function () {
      let thisArg = this

      if (thisArg === toStringThis) {
        thisArg = _toString
      } else if (isOwnProxy(thisArg)) {
        return nativeSourceText
      }

      return call(_toString, thisArg)
    }

    toString.prototype = void 0
    Object.setPrototypeOf(toString, funcProto)

    let toStringThis = toString

    try {
      if (! shared.support.proxiedFunctions) {
        funcProto.toString = toString
        return
      }

      const nativeNoop = noop.bind()

      setProperty(nativeNoop, "name", {
        enumerable: false,
        value: "toString",
        writable: false
      })

      Object.setPrototypeOf(nativeNoop, funcProto)

      toStringThis = nativeNoop

      funcProto.toString = new OwnProxy(nativeNoop, {
        __proto__: null,
        apply(target, thisArg, args) {
          return Reflect.apply(toString, thisArg, args)
        },
        construct(target, args) {
          return Reflect.construct(toString, args)
        }
      })

      checked.set(funcProto, true)
    } catch (e) {}
  }
}

export default Shim
