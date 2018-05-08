import alwaysFalse from "./always-false.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  return typeof (types && types.isWebAssemblyCompiledModule) === "function"
    ? types.isWebAssemblyCompiledModule
    : alwaysFalse
}

export default shared.inited
  ? shared.module.utilIsWebAssemblyCompiledModule
  : shared.module.utilIsWebAssemblyCompiledModule = init()
