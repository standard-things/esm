import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isPromise) === "function") {
    return types.isPromise
  }

  return function isPromise(value) {
    return isObject(value) &&
           getObjectTag(value) === "[object Promise]"
  }
}

export default shared.inited
  ? shared.module.utilIsPromise
  : shared.module.utilIsPromise = init()
