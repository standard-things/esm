import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import builtinModules from "../builtin-modules.js"
import { dirname } from "path"
import isObjectLike from "../util/is-object-like.js"
import keys from "../util/keys.js"
import makeRequireFunction from "../module/make-require-function.js"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(mod, options) {
  options = isObjectLike(options) ? options : null

  return makeRequireFunction(mod, (id) => {
    if (id in builtinModules) {
      return builtinModules[id].exports
    }

    const filePath = resolveFilename(id, mod, false, options)
    const pkgInfo = options === null ? PkgInfo.get(dirname(filePath)) : null
    const loadOptions = pkgInfo === null ? options : pkgInfo.options

    const copy = new Module(mod.id, mod.parent)
    const names = keys(mod)

    for (const name of names) {
      if (name !== "constructor") {
        copy[name] = mod[name]
      }
    }

    return moduleLoad(filePath, copy, loadOptions).exports
  })
}

export default hook
