import bind from "../util/bind.js"
import call from "../util/call.js"
import isProxy from "../util/is-proxy.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

const nativeSourceText = "function () { [native code] }"

function enable() {
  if (shared.support.functionToStringWithProxy) {
    return
  }

  // Section 19.2.3.5: Function.prototype.toString()
  // Step 3: Return "function () { [native code] }" for callable objects.
  // https://tc39.github.io/Function-prototype-toString-revision/#proposal-sec-function.prototype.tostring
  const { prototype } = shared.global.Function
  const _toString = prototype.toString

  const toString = function toString() {
    return isProxy(this)
      ? nativeSourceText
      : call(_toString, this)
  }

  setProperty(toString, "toString", {
    enumerable: false,
    value: bind(_toString.toString, _toString)
  })

  prototype.toString = toString
}

export default enable
