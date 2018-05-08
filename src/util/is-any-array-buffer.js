import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isAnyArrayBuffer) === "function") {
    return types.isAnyArrayBuffer
  }

  const { util } = binding
  const { isAnyArrayBuffer } = util

  if (typeof isAnyArrayBuffer === "function") {
    return isAnyArrayBuffer
  }

  const { isArrayBuffer, isSharedArrayBuffer } = util

  return function isAnyArrayBufferFallback(value) {
    return isArrayBuffer(value) ||
      isSharedArrayBuffer(value)
  }
}

export default shared.inited
  ? shared.module.utilIsAnyArrayBuffer
  : shared.module.utilIsAnyArrayBuffer = init()
