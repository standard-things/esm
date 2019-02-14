import { extname, sep } from "../safe/path.js"

import CHAR_CODE from "../constant/char-code.js"

import Loader from "../loader.js"

import dualResolveFilename from "../module/internal/dual-resolve-filename.js"
import isObjectLike from "../util/is-object-like.js"
import isOwnPath from "../util/is-own-path.js"
import isPath from "../util/is-path.js"
import keys from "../util/keys.js"
import realpath from "../fs/realpath.js"
import rootModule from "../root-module.js"
import shared from "../shared.js"

function init() {
  const {
    HYPHEN_MINUS
  } = CHAR_CODE

  function hasLoaderValue(value) {
    if (typeof value === "string") {
      if (isPath(value)) {
        let thePath = value

        if (extname(thePath) === "") {
          thePath += sep + "index.js"
        }

        if (isOwnPath(realpath(thePath))) {
          return true
        }
      } else if (value.charCodeAt(0) !== HYPHEN_MINUS &&
                 isOwnPath(tryDualResolveFilename(value, rootModule, false))) {
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

  function tryDualResolveFilename(request, parent, isMain) {
    const entryState = shared.entry
    const entryCache = entryState.cache

    const pkgState = Loader.state.package
    const pkgCache = pkgState.cache

    entryState.cache = new WeakMap
    pkgState.cache = new Map

    let result
    let threw = true

    try {
      result = dualResolveFilename(request, parent, isMain)
      threw = false
    } catch {}

    entryState.cache = entryCache
    pkgState.cache = pkgCache

    if (threw) {
      return ""
    }

    return result
  }

  return hasLoaderValue
}

export default shared.inited
  ? shared.module.envHasLoaderValue
  : shared.module.envHasLoaderValue = init()
