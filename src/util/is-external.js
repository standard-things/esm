import alwaysFalse from "./always-false.js"
import binding from "../binding.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isExternal) === "function") {
    return types.isExternal
  }

  return typeof binding.util.isExternal === "function"
    ? binding.util.isExternal
    : alwaysFalse
}

export default shared.inited
  ? shared.module.utilIsExternal
  : shared.module.utilIsExternal = init()
