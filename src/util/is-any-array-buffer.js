import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isAnyArrayBuffer) === "function") {
    return types.isAnyArrayBuffer
  }

  return typeof binding.util.isAnyArrayBuffer === "function"
    ? binding.util.isAnyArrayBuffer
    : binding.util.isArrayBuffer
}

export default shared.inited
  ? shared.module.utilIsAnyArrayBuffer
  : shared.module.utilIsAnyArrayBuffer = init()
