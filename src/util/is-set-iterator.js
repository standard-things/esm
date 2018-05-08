import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isSetIterator) === "function"
    ? types.isSetIterator
    : binding.util.isSetIterator
}

export default shared.inited
  ? shared.module.utilIsSetIterator
  : shared.module.utilIsSetIterator = init()
