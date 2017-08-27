import PkgInfo from "../pkg-info.js"

import { dirname } from "path"
import makeRequireFunction from "../module/make-require-function.js"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(mod) {
  return makeRequireFunction(mod, (id) => {
    const filePath = resolveFilename(id, mod)
    const pkgInfo = PkgInfo.get(dirname(filePath))

    return pkgInfo === null
      ? mod.require(filePath)
      : moduleLoad(filePath, mod)
  })
}

export default hook
