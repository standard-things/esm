import { basename, dirname, join } from "path"

import FastObject from "./fast-object.js"

import createOptions from "./util/create-options.js"
import has from "./util/has.js"
import readJSON from "./fs/read-json.js"
import readdir from "./fs/readdir.js"
import { validRange } from "semver"
import { version } from "./version.js"

const defaultOptions = createOptions({
  cache: ".esm-cache",
  cjs: false,
  debug: false,
  esm: "mjs",
  ext: false
})

const infoCache = new FastObject

class PkgInfo {
  constructor(dirPath, range, options) {
    options = typeof options === "string" ? { esm: options } : options
    options = createOptions(options, defaultOptions)

    if (! options.esm) {
      options.esm = "mjs"
    }

    const cache = Object.create(null)
    const cacheDir =  options.cache
    const cachePath = typeof cacheDir === "string" ? join(dirPath, cacheDir) : null
    const cacheFileNames = cachePath === null ? null : readdir(cachePath)

    let i = -1
    const nameCount = cacheFileNames === null ? 0 : cacheFileNames.length

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

  static get(dirPath) {
    if (dirPath in infoCache) {
      return infoCache[dirPath]
    }

    infoCache[dirPath] = null
    if (basename(dirPath) === "node_modules") {
      return null
    }

    const pkgInfo = PkgInfo.read(dirPath)
    if (pkgInfo !== null) {
      return infoCache[dirPath] = pkgInfo
    }

    const parentPath = dirname(dirPath)
    if (parentPath !== dirPath) {
      const pkgInfo = PkgInfo.get(parentPath)
      if (pkgInfo !== null) {
        return infoCache[dirPath] = pkgInfo
      }
    }

    return null
  }

  static read(dirPath) {
    const pkgPath = join(dirPath, "package.json")
    const pkgJSON = readJSON(pkgPath)

    if (pkgJSON === null) {
      return null
    }

    let options = null
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
    let range =
      getRange(pkgJSON, "dependencies") ||
      getRange(pkgJSON, "peerDependencies") ||
      getRange(pkgJSON, "devDependencies")

    if (range === null) {
      if (options !== null) {
        range = "*"
      } else {
        return null
      }
    }

    return new PkgInfo(dirPath, range, options)
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
