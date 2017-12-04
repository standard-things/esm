import { basename, dirname, extname, resolve } from "path"

import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import _createOptions from "./util/create-options.js"
import _findPath from "./module/_find-path.js"
import has from "./util/has.js"
import isObjectLike from "./util/is-object-like.js"
import loadESM from "./module/esm/load.js"
import parseJSON from "./util/parse-json.js"
import parseJSON6 from "./util/parse-json6.js"
import readFile from "./fs/read-file.js"
import readJSON6 from "./fs/read-json6.js"
import readdir from "./fs/readdir.js"
import { validRange } from "semver"
import { version } from "./version.js"

const ESMRC_FILENAME = ".esmrc"
const PACKAGE_FILENAME = "package.json"

const defaultOptions = {
  cache: true,
  cjs: {
    cache: false,
    extensions: false,
    interop: false,
    namedExports: false,
    paths: false,
    topLevelReturn: false,
    vars: false
  },
  debug: false,
  esm: "mjs",
  gz: false,
  sourceMap: void 0,
  warnings: process.env.NODE_ENV !== "production"
}

const defaultCJS = defaultOptions.cjs

const infoCache = new FastObject

const cjsKeys = Object.keys(defaultOptions.cjs)
const searchExts = [".mjs", ".js", ".json", ".gz", ".mjs.gz", ".js.gz"]

class PkgInfo {
  static createOptions = createOptions
  static defaultOptions = defaultOptions

  constructor(dirPath, range, options) {
    options = PkgInfo.createOptions(options)

    let cachePath = null

    if (typeof options.cache === "string") {
      cachePath = resolve(dirPath, options.cache)
    } else if (options.cache !== false) {
      cachePath = resolve(dirPath, "node_modules/.cache/@std/esm")
    }

    const cacheFileNames = cachePath === null
      ? cachePath
      : readdir(cachePath)

    let i = -1
    const cache = new NullObject
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

  static get(dirPath, force) {
    let pkgInfo

    if (dirPath in infoCache) {
      pkgInfo = infoCache[dirPath]

      if (! force || pkgInfo) {
        return pkgInfo
      }
    }

    infoCache[dirPath] = null

    if (basename(dirPath) === "node_modules") {
      return force
        ? infoCache[dirPath] = PkgInfo.read(dirPath, true)
        : null
    }

    pkgInfo = PkgInfo.read(dirPath)

    if (pkgInfo === null) {
      const parentPath = dirname(dirPath)
      pkgInfo = parentPath === dirPath ? null : PkgInfo.get(parentPath)
    }

    if (force &&
        pkgInfo === null) {
      pkgInfo = PkgInfo.read(dirPath, force)
    }

    return infoCache[dirPath] = pkgInfo
  }

  static read(dirPath, force) {
    let optionsPath
    let pkgInfo

    let options = readFile(resolve(dirPath, ESMRC_FILENAME), "utf8")
    let optionsFound = options !== null

    if (optionsFound) {
      options = parseJSON6(options)
    } else {
      optionsPath = _findPath(ESMRC_FILENAME, [dirPath], false, true, true, searchExts)
    }

    if (optionsPath) {
      optionsFound = true

      if (extname(optionsPath) === ".json") {
        options = readJSON6(optionsPath)
      } else {
        pkgInfo =
        infoCache[dirPath] = new PkgInfo(dirPath, "*", {
          cjs: true,
          esm: "js",
          gz: true
        })

        options = loadESM(optionsPath, null, false).exports
      }
    }

    let parentPkgInfo
    let pkgParsed = false
    let pkgJSON = readFile(resolve(dirPath, PACKAGE_FILENAME), "utf8")

    if (! force &&
        pkgJSON === null) {
      if (optionsFound) {
        parentPkgInfo = PkgInfo.get(dirname(dirPath))
      } else {
        return null
      }
    }

    if (! optionsFound) {
      pkgParsed = true
      pkgJSON = parseJSON(pkgJSON)

      if (has(pkgJSON, "@std/esm")) {
        optionsFound = true
        options = pkgJSON["@std/esm"]
      } else if (has(pkgJSON, "@std") && has(pkgJSON["@std"], "esm")) {
        optionsFound = true
        options = pkgJSON["@std"].esm
      }
    }

    let range

    if (force) {
      range = "*"
    } else if (parentPkgInfo) {
      range = parentPkgInfo.range
    } else {
      if (! pkgParsed) {
        pkgParsed = true
        pkgJSON = parseJSON(pkgJSON)
      }

      // A package.json may have `@std/esm` in its "devDependencies" object
      // because it expects another package or application to enable ESM loading
      // in production, but needs `@std/esm` during development.
      range =
        getRange(pkgJSON, "dependencies") ||
        getRange(pkgJSON, "peerDependencies")

      if (range === null) {
        if (optionsFound ||
            getRange(pkgJSON, "devDependencies")) {
          range = "*"
        } else {
          return null
        }
      }
    }

    if (pkgInfo) {
      pkgInfo.options = PkgInfo.createOptions(options)
      pkgInfo.range = range
    } else {
      pkgInfo = new PkgInfo(dirPath, range, options)
    }

    return pkgInfo
  }

  static set(dirPath, pkgInfo) {
    infoCache[dirPath] = pkgInfo
  }
}

function createCJS(source) {
  const object = new NullObject

  if (isObjectLike(source)) {
    for (const key of cjsKeys) {
      object[key] = has(source, key)
        ? !! source[key]
        : defaultCJS[key]
    }
  } else {
    const value = !! source

    for (const key of cjsKeys) {
      object[key] = value
    }
  }

  return object
}

function createOptions(options) {
  let cjsOptions
  let sourceMap
  const { defaultOptions } = PkgInfo

  options = toOptions(options)

  if (has(options, "cjs")) {
    cjsOptions = createCJS(options.cjs)
  }

  if (has(options, "sourceMap")) {
    sourceMap = options.sourceMap
  } else if (has(options, "sourcemap")) {
    sourceMap = options.sourcemap
  }

  options = _createOptions(options, defaultOptions)

  if (typeof options.cache !== "string") {
    options.cache = !! options.cache
  }

  if (cjsOptions) {
    options.cjs = cjsOptions
  }

  if (options.esm !== "all" &&
      options.esm !== "js") {
    options.esm = "mjs"
  }

  if (sourceMap !== void 0) {
    options.sourceMap = !! sourceMap
    delete options.sourcemap
  }

  options.debug = !! options.debug
  options.gz = !! options.gz
  options.warnings = !! options.warnings

  return options
}

function getRange(json, name) {
  if (has(json, name)) {
    const object = json[name]

    if (has(object, "@std/esm")) {
      return validRange(object["@std/esm"])
    }
  }

  return null
}

function toOptions(value) {
  if (typeof value === "string") {
    return value === "cjs"
      ? { cjs: true, esm: "js" }
      : { esm: value }
  }

  return isObjectLike(value) ? value : {}
}

Object.setPrototypeOf(PkgInfo.prototype, null)

// Enable in-memory caching when compiling without a file path.
infoCache[""] = new PkgInfo("", version, {
  cache: false,
  cjs: true,
  gz: true
})

export default PkgInfo
