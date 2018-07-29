import isProxy from "./is-proxy.js"
import shared from "../shared.js"

function init() {
  // `Function.prototype.toString` is used to extract the coerced string source
  // of a function regardless of any custom `toString` method it may have.
  const { toString } = Function.prototype

  // A native method, e.g. `Function.prototype.toString`, is used as a template
  // to compare other native methods against. Escape special RegExp characters
  // and remove method identifiers before converting the template to a regexp.
  const markerRegExp = /toString|(function ).*?(?=\\\()/g
  const specialCharRegExp = /[\\^$.*+?()[\]{}|]/g
  const nativeRegExp = RegExp(
    "^" +
    toString.call(toString)
      .replace(specialCharRegExp, "\\$&")
      .replace(markerRegExp, "$1.*?") +
    "$"
  )

  function isNative(func) {
    if (typeof func !== "function" ||
        ! tryNativeTest(func)) {
      return false
    }

    const { name } = func

    // Section 19.2.3.2: Function.prototype.bind()
    // Step 11: Bound function names start with "bound ".
    // https://tc39.github.io/ecma262/#sec-function.prototype.bind
    if (typeof name === "string" &&
        name.startsWith("bound ")) {
      return false
    }

    return ! isProxy(func)
  }

  function tryNativeTest(func) {
    // A try-catch is needed in Node < 10 to avoid a type error when
    // coercing proxy wrapped functions.
    try {
      return nativeRegExp.test(toString.call(func))
    } catch (e) {}

    return false
  }

  return isNative
}

export default shared.inited
  ? shared.module.utilIsNative
  : shared.module.utilIsNative = init()
