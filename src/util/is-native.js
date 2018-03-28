import isProxy from "./is-proxy.js"

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
  return typeof func === "function" &&
    ! isProxy(func) &&
    nativeRegExp.test(toString.call(func))
}

export default isNative
