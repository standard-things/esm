import { extname, resolve } from "path"

import _resolveFilename from "../module/esm/_resolve-filename.js"
import isObjectLike from "../util/is-object-like.js"
import isPath from "../util/is-path.js"
import realpath from "../fs/realpath.js"
import rootModule from "../root-module.js"

const { keys } = Object

const stdFilename = __non_webpack_module__.filename

function hasLoaderValue(value) {
  if (typeof value === "string") {
    if (isPath(value)) {
      let resolved = resolve(value)

      if (! extname(resolved)) {
        resolved += "/index.js"
      }

      if (realpath(resolved) === stdFilename) {
        return true
      }
    } else if (value.charCodeAt(0) !== 45 /* - */ &&
        _resolveFilename(value, rootModule) === stdFilename) {
      return true
    }
  } else if (isObjectLike(value)) {
    const names = keys(value)

    for (const name of names) {
      if (hasLoaderValue(value[name])) {
        return true
      }
    }
  }

  return false
}

export default hasLoaderValue
