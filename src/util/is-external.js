import alwaysFalse from "./always-false.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isExternal) === "function"
    ? types.isExternal
    : alwaysFalse
}

export default shared.inited
  ? shared.module.utilIsExternal
  : shared.module.utilIsExternal = init()
