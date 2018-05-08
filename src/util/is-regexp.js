import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isRegExp) === "function"
    ? types.isRegExp
    : binding.util.isRegExp
}

export default shared.inited
  ? shared.module.utilIsRegExp
  : shared.module.utilIsRegExp = init()
