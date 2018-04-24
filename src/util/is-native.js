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
    if (typeof func !== "function" ||
        isProxy(func)) {
      return false
    }

    try {
      if (nativeRegExp.test(toString.call(func))) {
        const { name } = func

        if (typeof name !== "string" ||
            ! name.startsWith("bound ")) {
          return true
        }
      }
    } catch (e) {}

    return false
  }

  return isNative
}

export default shared.inited
  ? shared.module.utilIsNative
  : shared.module.utilIsNative = init()
