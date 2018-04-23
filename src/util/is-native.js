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
  if (typeof func === "function") {
    try {
      return nativeRegExp.test(toString.call(func))
    } catch (e) {}
  }

  return false
}

export default isNative
