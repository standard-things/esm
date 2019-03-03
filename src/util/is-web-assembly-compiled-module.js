import getObjectTag from "./get-object-tag.js"
import isObject from "./is-object.js"
import shared from "../shared.js"
import { types } from "../safe/util.js"

function init() {
  if (typeof (types && types.isWebAssemblyCompiledModule) === "function") {
    return types.isWebAssemblyCompiledModule
  }

  return function isWebAssemblyCompiledModule(value) {
    return isObject(value) &&
      getObjectTag(value) === "[object WebAssembly.Module]"
  }
}

export default shared.inited
  ? shared.module.utilIsWebAssemblyCompiledModule
  : shared.module.utilIsWebAssemblyCompiledModule = init()
