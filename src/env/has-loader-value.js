import CHAR_CODE from "../constant/char-code.js"

import Module from "../module.js"

import extname from "../path/extname.js"
import isObjectLike from "../util/is-object-like.js"
import isOwnPath from "../util/is-own-path.js"
import isPath from "../util/is-path.js"
import keys from "../util/keys.js"
import realpath from "../fs/realpath.js"
import { resolve } from "../safe/path.js"
import resolveFilename from "../module/esm/resolve-filename.js"
import rootModule from "../root-module.js"

const {
  HYPHEN_MINUS
} = CHAR_CODE

function hasLoaderValue(value) {
  if (typeof value === "string") {
    if (isPath(value)) {
      let resolved = resolve(value)

      if (! extname(resolved)) {
        resolved += "/index.js"
      }

      if (isOwnPath(realpath(resolved))) {
        return true
      }
    } else if (value.charCodeAt(0) !== HYPHEN_MINUS &&
        isOwnPath(tryResolveFilename(value, rootModule))) {
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

function tryResolveFilename(request, parent) {
  try {
    return resolveFilename(request, parent)
  } catch (e) {}

  try {
    return Module._resolveFilename(request, parent)
  } catch (e) {}

  return ""
}

export default hasLoaderValue
