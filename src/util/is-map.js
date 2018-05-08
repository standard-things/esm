import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isMap) === "function"
    ? types.isMap
    : binding.util.isMap
}

export default shared.inited
  ? shared.module.utilIsMap
  : shared.module.utilIsMap = init()
