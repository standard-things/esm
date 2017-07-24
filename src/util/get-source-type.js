import isESModule from "./is-esmodule.js"
import isESModuleLike from "./is-esmodule-like.js"

function getSourceType(exported) {
  if (isESModule(exported)) {
    return "module"
  }

  if (isESModuleLike(exported)) {
    return "module-like"
  }

  return "script"
}

export default getSourceType
