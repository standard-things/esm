import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import builtinEntries from "../builtin-entries.js"
import isObjectLike from "../util/is-object-like.js"
import loadESM from "../module/esm/load.js"
import makeRequireFunction from "../module/make-require-function.js"

function hook(parent, options) {
  if (isObjectLike(options)) {
    const parentPkgInfo = PkgInfo.from(parent, true)
    assign(parentPkgInfo.options, PkgInfo.createOptions(options))
  }

  return makeRequireFunction(parent, (request) =>
  request in builtinEntries
      ? builtinEntries.module.exports
      : loadESM(request, parent, false).module.exports
  )
}

export default hook
