import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isRegExp) === "function") {
    return types.isRegExp
  }

  return function isRegExp(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object RegExp]"
  }
}

export default shared.inited
  ? shared.module.utilIsRegExp
  : shared.module.utilIsRegExp = init()
