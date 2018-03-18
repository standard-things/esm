import { extname, resolve } from "../safe/path.js"

import CHAR_CODE from "../constant/char-code.js"
import ESM from "../constant/esm.js"

import _resolveFilename from "../module/esm/_resolve-filename.js"
import isObjectLike from "../util/is-object-like.js"
import isPath from "../util/is-path.js"
import keys from "../util/keys.js"
import realpath from "../fs/realpath.js"
import rootModule from "../root-module.js"

const {
  HYPHEN
} = CHAR_CODE

const {
  PKG_DIRNAME
} = ESM

function hasLoaderValue(value) {
  if (typeof value === "string") {
    if (isPath(value)) {
      let resolved = resolve(value)

      if (! extname(resolved)) {
        resolved += "/index.js"
      }

      if (realpath(resolved).startsWith(PKG_DIRNAME)) {
        return true
      }
    } else if (value.charCodeAt(0) !== HYPHEN &&
        _resolveFilename(value, rootModule).startsWith(PKG_DIRNAME)) {
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
