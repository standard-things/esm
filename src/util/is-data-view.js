import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isDataView) === "function"
    ? types.isDataView
    : binding.util.isDataView
}

export default shared.inited
  ? shared.module.utilIsDataView
  : shared.module.utilIsDataView = init()
