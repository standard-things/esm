import call from "../util/call.js"
import isProxy from "../util/is-proxy.js"
import noop from "../util/noop.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

const nativeSourceText = "function () { [native code] }"

const Shim = {
  __proto__: null,
  enable() {
    const { support } = shared

    if (support.functionToStringWithProxy) {
      return
    }

    // Section 19.2.3.5: Function.prototype.toString()
    // Step 3: Return "function () { [native code] }" for callable objects.
    // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
    const funcProto = shared.global.Function.prototype
    const _toString = funcProto.toString

    const toString = function () {
      let thisArg = this

      if (thisArg === toStringThis) {
        thisArg = _toString
      } else if (isProxy(thisArg)) {
        return nativeSourceText
      }

      return call(_toString, thisArg)
    }

    let toStringThis = toString

    toString.prototype = void 0
    Object.setPrototypeOf(toString, funcProto)

    try {
      if (! support.proxiedFunctions) {
        funcProto.toString = toString
        return
      }

      const { apply, construct } = Reflect
      const nativeNoop = noop.bind()

      setProperty(nativeNoop, "name", {
        enumerable: false,
        value: "toString",
        writable: false
      })

      Object.setPrototypeOf(nativeNoop, funcProto)

      toStringThis = nativeNoop

      funcProto.toString = new Proxy(nativeNoop, {
        __proto__: null,
        apply(target, thisArg, args) {
          return apply(toString, thisArg, args)
        },
        construct(target, args) {
          return construct(toString, args)
        }
      })
    } catch (e) {}
  }
}

export default Shim
