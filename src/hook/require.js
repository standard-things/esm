import PkgInfo from "../pkg-info.js"

import builtinModules from "../builtin-modules.js"
import { dirname } from "path"
import isObjectLike from "../util/is-object-like.js"
import loadESM from "../module/esm/load.js"
import makeRequireFunction from "../module/make-require-function.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(parent, options) {
  options = isObjectLike(options) ? PkgInfo.createOptions(options) : null

  return makeRequireFunction(parent, (id) => {
    if (id in builtinModules) {
      return builtinModules[id].exports
    }

    const filePath = resolveFilename(id, parent, false, options)
    const pkgInfo = options ? null : PkgInfo.get(dirname(filePath))
    const loadOptions = pkgInfo ? pkgInfo.options : options

    return loadESM(filePath, parent, false, loadOptions).exports
  })
}

export default hook
