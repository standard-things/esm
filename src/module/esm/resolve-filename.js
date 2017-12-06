import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _resolveFilename from "./_resolve-filename.js"
import builtinModules from "../../builtin-modules.js"
import moduleResolveFilename from "../cjs/resolve-filename.js"

function resolveFilename(id, parent, isMain) {
  if (Module._resolveFilename !== moduleResolveFilename) {
    const parentPkgInfo = PkgInfo.from(parent)

    if (parentPkgInfo && parentPkgInfo.options.cjs.paths) {
      return Module._resolveFilename(id, parent, isMain)
    }
  }

  return id in builtinModules
    ? id
    : _resolveFilename(id, parent, isMain)
}

export default resolveFilename
