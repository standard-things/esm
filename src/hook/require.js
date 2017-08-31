import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import createOptions from "../util/create-options.js"
import { dirname } from "path"
import isObjectLike from "../util/is-object-like.js"
import keys from "../util/keys.js"
import makeRequireFunction from "../module/make-require-function.js"
import moduleLoad from "../module/esm/load.js"
import resolveFilename from "../module/esm/resolve-filename.js"

function hook(mod, options) {
  options = isObjectLike(options)
    ? createOptions(options, PkgInfo.defaultOptions)
    : null

  return makeRequireFunction(mod, (id) => {
    const filePath = resolveFilename(id, mod)
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
