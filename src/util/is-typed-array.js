import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isTypedArray) === "function"
    ? types.isTypedArray
    : binding.util.isTypedArray
}

export default shared.inited
  ? shared.module.utilIsTypedArray
  : shared.module.utilIsTypedArray = init()
