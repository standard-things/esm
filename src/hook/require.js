import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import { dirname } from "path"
import keys from "../util/keys.js"
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

    const copy = new Module(mod.id, mod.parent)
    const names = keys(mod)

    for (const name of names) {
      if (name !== "constructor") {
        copy[name] = mod[name]
      }
    }

    return moduleLoad(filePath, copy, pkgInfo.options).exports
  })
}

export default hook
