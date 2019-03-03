import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isSet) === "function") {
    return types.isSet
  }

  return function isSet(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object Set]"
  }
}

export default shared.inited
  ? shared.module.utilIsSet
  : shared.module.utilIsSet = init()
