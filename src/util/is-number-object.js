import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isNumberObject) === "function") {
    return types.isNumberObject
  }

  const { toString } = Object.prototype

  return function isNumberObjectFallback(value) {
    return isObject(value) &&
      toString.call(value) === "[object Number]"
  }
}

export default shared.inited
  ? shared.module.utilIsNumberObject
  : shared.module.utilIsNumberObject = init()
