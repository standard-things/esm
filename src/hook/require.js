import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import assign from "../util/assign.js"
import { dirname } from "path"
import makeRequireFunction from "../module/make-require-function.js"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(mod) {
  return makeRequireFunction(mod, (id) => {
    const filePath = resolveFilename(id, mod)
    const pkgInfo = PkgInfo.get(dirname(filePath))

    if (pkgInfo === null) {
      return mod.require(filePath)
    }

    const copy = assign(new Module(mod.id, mod.parent), mod)
    return moduleLoad(filePath, copy, pkgInfo.options)
  })
}

export default hook
