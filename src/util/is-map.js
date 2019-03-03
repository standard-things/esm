import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isMap) === "function") {
    return types.isMap
  }

  return function isMap(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object Map]"
  }
}

export default shared.inited
  ? shared.module.utilIsMap
  : shared.module.utilIsMap = init()
