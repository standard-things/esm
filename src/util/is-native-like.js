import escapeRegExp from "./escape-regexp.js"
import shared from "../shared.js"

function init() {
  // `Function#toString()` is used to extract the coerced string source of a
  // function regardless of any custom `toString()` method it may have.
  const { toString } = Function.prototype

  // A native method, e.g. `Function#toString()`, is used as a template to
  // compare other native methods against. Escape special RegExp characters
  // and remove method identifiers before converting the template to a regexp.
  const markerRegExp = /toString|(function ).*?(?=\\\()/g

  const nativeRegExp = RegExp(
    "^" +
    escapeRegExp(toString.call(toString))
      .replace(markerRegExp, "$1.*?") +
    "$"
  )

  function isNativeLike(func) {
    return typeof func === "function" &&
           tryNativeTest(func)
  }

  function tryNativeTest(func) {
    // A try-catch is needed in Node < 10 to avoid a type error when
    // coercing proxy wrapped functions.
    try {
      return nativeRegExp.test(toString.call(func))
    } catch {}

    return false
  }

  return isNativeLike
}

export default shared.inited
  ? shared.module.utilIsNativeLike
  : shared.module.utilIsNativeLike = init()
