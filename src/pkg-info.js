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
  esm: "mjs",
  sourceMap: void 0
}

const infoCache = new FastObject

class PkgInfo {
  constructor(dirPath, range, options) {
    options = typeof options === "string" ? { esm: options } : options

    let sourceMap

    if (has(options, "sourcemap") &&
        ! has(options, "sourceMap")) {
      sourceMap = options.sourcemap
    }

    options = createOptions(options, defaultOptions)

    if (! options.esm) {
      options.esm = "mjs"
    }

    if (sourceMap !== void 0) {
      options.sourceMap = sourceMap
      delete options.sourcemap
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
      // An explicit `@std/esm` property value of `false` disables ESM loading
      // even if `@std/esm` is listed as a dependency.
      return null
    }

    // A package.json may have `@std/esm` in its "devDependencies" object
    // because it expects another package or application to enable ESM loading
    // in production, but needs `@std/esm` during development.
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
