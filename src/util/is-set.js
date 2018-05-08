import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isSet) === "function"
    ? types.isSet
    : binding.util.isSet
}

export default shared.inited
  ? shared.module.utilIsSet
  : shared.module.utilIsSet = init()
