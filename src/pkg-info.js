import { basename, dirname, resolve } from "path"

import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import createOptions from "./util/create-options.js"
import has from "./util/has.js"
import readJSON from "./fs/read-json.js"
import readdir from "./fs/readdir.js"
import { validRange } from "semver"
import { version } from "./version.js"

const defaultOptions = {
  cache: ".esm-cache",
  cjs: false,
  debug: false,
  esm: "mjs"
}

const infoCache = new FastObject

class PkgInfo {
  constructor(dirPath, range, options) {
    options = typeof options === "string" ? { esm: options } : options
    options = createOptions(options, defaultOptions)

    if (! options.esm) {
      options.esm = "mjs"
    }

    const cache = new NullObject
    const cacheDir =  options.cache
    const cachePath = typeof cacheDir === "string" ? resolve(dirPath, cacheDir) : null
    const cacheFileNames = cachePath === null ? null : readdir(cachePath)

    let i = -1
    const nameCount = cacheFileNames ? cacheFileNames.length : 0

    while (++i < nameCount) {
      // Later, in the ".js" or ".mjs" compiler, we'll change the cached value
      // to its associated mocked compiler result, but for now we merely register
      // that a cache file exists.
      cache[cacheFileNames[i]] = true
    }

    this.cache = cache
    this.cachePath = cachePath
    this.dirPath = dirPath
    this.options = options
    this.range = range
  }

  static defaultOptions = defaultOptions

  static get(dirPath) {
    if (dirPath in infoCache) {
      return infoCache[dirPath]
    }

    infoCache[dirPath] = null

    if (basename(dirPath) === "node_modules") {
      return null
    }

    let pkgInfo = PkgInfo.read(dirPath)

    if (pkgInfo === null) {
      const parentPath = dirname(dirPath)
      pkgInfo = parentPath === dirPath ? null : PkgInfo.get(parentPath)
    }

    return infoCache[dirPath] = pkgInfo
  }

  static read(dirPath, force) {
    const pkgPath = resolve(dirPath, "package.json")
    let pkgJSON = readJSON(pkgPath)

    if (pkgJSON === null) {
      if (force) {
        pkgJSON = new NullObject
      } else {
        return null
      }
    }

    let options = null
    if (has(pkgJSON, "@std/esm")) {
      options = pkgJSON["@std/esm"]
    } else if (has(pkgJSON, "@std") && has(pkgJSON["@std"], "esm")) {
      options = pkgJSON["@std"].esm
    }

    if (! force &&
        options === false) {
      // An explicit "@std/esm": false property in package.json disables esm
      // loading even if "@std/esm" is listed as a dependency.
      return null
    }

    // Use case: a package.json file may have "@std/esm" in its "devDependencies"
    // object because it expects another package or application to enable esm
    // loading in production, but needs its own copy of the "@std/esm" package
    // during development. Disabling esm loading in production when it was
    // enabled in development would be undesired in this case.
    let range =
      getRange(pkgJSON, "dependencies") ||
      getRange(pkgJSON, "peerDependencies")

    if (force) {
      range = "*"
    } else if (range === null) {
      if (options ||
          getRange(pkgJSON, "devDependencies")) {
        range = "*"
      } else {
        return null
      }
    }

    const pkgInfo = new PkgInfo(dirPath, range, options)

    if (force &&
        options === false) {
      pkgInfo.options = null
    }

    return pkgInfo
  }

  static set(dirPath, pkgInfo) {
    infoCache[dirPath] = pkgInfo
  }
}

function getRange(json, name) {
  const entry = json[name]
  return has(entry, "@std/esm")
    ? validRange(entry["@std/esm"])
    : null
}

Object.setPrototypeOf(PkgInfo.prototype, null)

// Enable in-memory caching when compiling without a file path.
infoCache[""] = new PkgInfo("", version, {
  cache: false,
  cjs: true,
  gz: true
})

export default PkgInfo
