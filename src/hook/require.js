import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import isObjectLike from "../util/is-object-like.js"
import loadESM from "../module/esm/load.js"
import makeRequireFunction from "../module/make-require-function.js"

function hook(parent, options) {
  const parentPkgInfo = PkgInfo.from(parent, true)
  const requirer = (id) => loadESM(id, parent, false)

  if (isObjectLike(options)) {
    assign(parentPkgInfo.options, PkgInfo.createOptions(options))
  }

  return makeRequireFunction(parent, requirer)
}

export default hook
