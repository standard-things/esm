import { extname, resolve } from "path"

import ASCII from "../ascii.js"
import GenericString from "../generic/string.js"

import _resolveFilename from "../module/esm/_resolve-filename.js"
import isObjectLike from "../util/is-object-like.js"
import isPath from "../util/is-path.js"
import keys from "../util/keys.js"
import realpath from "../fs/realpath.js"
import rootModule from "../root-module.js"

const {
  HYPHEN
} = ASCII

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
    } else if (GenericString.charCodeAt(value, 0) !== HYPHEN &&
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
