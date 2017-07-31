import FastObject from "./fast-object.js"
import SemVer from "semver"

import createOptions from "./util/create-options.js"
import esmSemVer from "./util/version.js"
import has from "./util/has.js"
import path from "path"
import readJSON from "./fs/read-json.js"
import readdir from "./fs/readdir.js"
import toString from "./util/to-string.js"

const defaultOptions = {
  cache: ".esm-cache",
  cjs: false,
  debug: false,
  esm: false,
  ext: false,
  var: false
}

const infoCache = new FastObject

class PkgInfo {
  constructor(dirPath, range, options) {
    options = createOptions(options, defaultOptions)

    if (options.esm === "mjs") {
      options.esm = false
    }

    const cache = Object.create(null)
    const cacheDir =  options.cache
    const cachePath = typeof cacheDir === "string" ? path.join(dirPath, cacheDir) : null
    const cacheFileNames = cachePath === null ? null : readdir(cachePath)

    let i = -1
    const nameCount = cacheFileNames === null ? 0 : cacheFileNames.length

    while (++i < nameCount) {
      // Later, in Module._extensions[".js"], we'll change the cached value to
      // its associated mocked compiler result, but for now we merely register
      // that a cache file exists.
      cache[cacheFileNames[i]] = true
    }

    this.cache = cache
    this.cachePath = cachePath
    this.dirPath = dirPath
    this.options = options
    this.range = range
  }

  static get(dirPath) {
    dirPath = toString(dirPath)
    if (dirPath in infoCache) {
      return infoCache[dirPath]
    }

    infoCache[dirPath] = null
    if (path.basename(dirPath) === "node_modules") {
      return null
    }

    const pkgInfo = PkgInfo.read(dirPath)
    if (pkgInfo !== null) {
      return infoCache[dirPath] = pkgInfo
    }

    const parentPath = path.dirname(dirPath)
    if (parentPath !== dirPath) {
      const pkgInfo = PkgInfo.get(parentPath)
      if (pkgInfo !== null) {
        return infoCache[dirPath] = pkgInfo
      }
    }

    return null
  }

  static read(dirPath) {
    const pkgPath = path.join(dirPath, "package.json")
    const pkgJSON = readJSON(pkgPath)

    if (pkgJSON === null) {
      return null
    }

    let options
    if (has(pkgJSON, "@std/esm")) {
      options = pkgJSON["@std/esm"]
    } else if (has(pkgJSON, "@std") && has(pkgJSON["@std"], "esm")) {
      options = pkgJSON["@std"].esm
    }

    if (options === false) {
      // An explicit "@std/esm": false property in package.json disables esm
      // loading even if "@std/esm" is listed as a dependency.
      return null
    }

    // Use case: a package.json file may have "@std/esm" in its "devDependencies"
    // object because it expects another package or application to enable esm
    // loading in production, but needs its own copy of the "@std/esm" package
    // during development. Disabling esm loading in production when it was
    // enabled in development would be undesired in this case.
    const range =
      getRange(pkgJSON, "dependencies") ||
      getRange(pkgJSON, "peerDependencies") ||
      getRange(pkgJSON, "devDependencies")

    if (range === null) {
      return null
    }

    return new PkgInfo(dirPath, range, options)
  }
}

function getRange(json, name) {
  const entry = json[name]
  return has(entry, "@std/esm")
    ? SemVer.validRange(entry["@std/esm"])
    : null
}

Object.setPrototypeOf(PkgInfo.prototype, null)

// Enable in-memory caching when compiling without a file path.
infoCache[""] = new PkgInfo("", esmSemVer.version, {
  cache: false,
  cjs: true,
  var: true
})

export default PkgInfo
