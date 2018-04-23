import isProxy from "./is-proxy.js"
import shared from "../shared.js"

function init() {
  const { toString } = Function.prototype

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
    if (typeof func === "function" &&
        ! isProxy(func)) {
      try {
        return nativeRegExp.test(toString.call(func))
      } catch (e) {}
    }

    return false
  }

  return isNative
}

export default shared.inited
  ? shared.module.utilIsNative
  : shared.module.utilIsNative = init()
