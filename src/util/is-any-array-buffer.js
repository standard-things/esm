import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isAnyArrayBuffer) === "function") {
    return types.isAnyArrayBuffer
  }

  return function isAnyArrayBufferFallback(value) {
    if (! isObject(value)) {
      return false
    }

    const tag = getObjectTag(value)

    return tag === "[object ArrayBuffer]" ||
      tag === "[object SharedArrayBuffer]"
  }
}

export default shared.inited
  ? shared.module.utilIsAnyArrayBuffer
  : shared.module.utilIsAnyArrayBuffer = init()
