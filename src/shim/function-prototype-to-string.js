import call from "../util/call.js"
import isProxy from "../util/is-proxy.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

const nativeSourceText = "function () { [native code] }"

function enable() {
  const { support } = shared

  if (support.functionToStringWithProxy) {
    return
  }

  // Section 19.2.3.5: Function.prototype.toString()
  // Step 3: Return "function () { [native code] }" for callable objects.
  // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
  const { prototype } = shared.global.Function
  const _toString = prototype.toString

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
  Object.setPrototypeOf(toString, prototype)

  try {
    if (! support.proxiedFunctions) {
      prototype.toString = toString
      return
    }

    const { apply, construct } = Reflect
    const noop = (function toString() {}).bind()

    toStringThis = noop

    setProperty(noop, "name", {
      enumerable: false,
      value: "toString",
      writable: false
    })

    Object.setPrototypeOf(noop, prototype)

    prototype.toString = new Proxy(noop, {
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

export default enable
