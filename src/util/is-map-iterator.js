import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isMapIterator) === "function") {
    return types.isMapIterator
  }

  return function isMapIterator(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object Map Iterator]"
  }
}

export default shared.inited
  ? shared.module.utilIsMapIterator
  : shared.module.utilIsMapIterator = init()
