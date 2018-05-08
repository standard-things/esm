import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isAnyArrayBuffer) === "function") {
    return types.isAnyArrayBuffer
  }

  const { util } = binding
  const { isAnyArrayBuffer } = util

  return typeof isAnyArrayBuffer === "function"
    ? isAnyArrayBuffer
    : util.isArrayBuffer
}

export default shared.inited
  ? shared.module.utilIsAnyArrayBuffer
  : shared.module.utilIsAnyArrayBuffer = init()
