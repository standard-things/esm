import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isMapIterator) === "function"
    ? types.isMapIterator
    : binding.util.isMapIterator
}

export default shared.inited
  ? shared.module.utilIsMapIterator
  : shared.module.utilIsMapIterator = init()
