import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import builtinModules from "../builtin-modules.js"
import { dirname } from "path"
import isObjectLike from "../util/is-object-like.js"
import keys from "../util/keys.js"
import makeRequireFunction from "../module/make-require-function.js"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(parent, options) {
  options = isObjectLike(options) ? options : null

  return makeRequireFunction(parent, (id) => {
    if (id in builtinModules) {
      return builtinModules[id].exports
    }

    const filePath = resolveFilename(id, parent, false, options)
    const pkgInfo = options ? null : PkgInfo.get(dirname(filePath))
    const loadOptions = pkgInfo ? pkgInfo.options : options

    const copy = new Module(parent.id, null)
    copy.filename = parent.filename
    copy.parent = parent.parent

    const names = keys(parent)

    for (const name of names) {
      if (name !== "constructor") {
        copy[name] = parent[name]
      }
    }

    return moduleLoad(filePath, copy, false, loadOptions).exports
  })
}

export default hook
