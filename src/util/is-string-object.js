import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isStringObject) === "function") {
    return types.isStringObject
  }

  return function isStringObject(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object String]"
  }
}

export default shared.inited
  ? shared.module.utilIsStringObject
  : shared.module.utilIsStringObject = init()
