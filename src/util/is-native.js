const { toString } = Function.prototype

function isNative(func) {
  return typeof func === "function" &&
    toString.call(func).indexOf("[native code]") !== -1
}

export default isNative
