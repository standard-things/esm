import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _resolveFilename from "./_resolve-filename.js"
import { dirname } from "path"
import moduleResolveFilename from "../cjs/resolve-filename.js"

function resolveFilename(id, parent, isMain) {
  if (Module._resolveFilename !== moduleResolveFilename) {
    const parentFilePath = (parent && parent.filename) || "."
    const parentPkgInfo = PkgInfo.get(dirname(parentFilePath))
    const parentOptions = parentPkgInfo && parentPkgInfo.options

    if (parentOptions && parentOptions.cjs.paths) {
      return Module._resolveFilename(id, parent, isMain)
    }
  }

  return _resolveFilename(id, parent, isMain)
}

export default resolveFilename
