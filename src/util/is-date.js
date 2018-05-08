import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isDate) === "function"
    ? types.isDate
    : binding.util.isDate
}

export default shared.inited
  ? shared.module.utilIsDate
  : shared.module.utilIsDate = init()
