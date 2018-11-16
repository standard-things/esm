import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isSetIterator) === "function") {
    return types.isSetIterator
  }

  return function isSetIteratorFallback(value) {
    return isObject(value) &&
      getObjectTag(value) === "[object Set Iterator]"
  }
}

export default shared.inited
  ? shared.module.utilIsSetIterator
  : shared.module.utilIsSetIterator = init()
