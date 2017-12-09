import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import builtinModules from "../builtin-modules.js"
import isObjectLike from "../util/is-object-like.js"
import loadESM from "../module/esm/load.js"
import makeRequireFunction from "../module/make-require-function.js"

function hook(parent, options) {
  const parentPkgInfo = PkgInfo.from(parent, true)

  if (isObjectLike(options)) {
    assign(parentPkgInfo.options, PkgInfo.createOptions(options))
  }

  return makeRequireFunction(parent, (id) => {
    return id in builtinModules
      ? builtinModules[id].exports
      : loadESM(id, parent, false).exports
  })
}

export default hook
