import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isDate) === "function") {
    return types.isDate
  }

  return function isDate(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object Date]"
  }
}

export default shared.inited
  ? shared.module.utilIsDate
  : shared.module.utilIsDate = init()
