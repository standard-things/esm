import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isStringObject) === "function") {
    return types.isStringObject
  }

  const { toString } = Object.prototype

  return function isStringObjectFallback(value) {
    return isObject(value) &&
      toString.call(value) === "[object String]"
  }
}

export default shared.inited
  ? shared.module.utilIsStringObject
  : shared.module.utilIsStringObject = init()
