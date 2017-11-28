import { basename, dirname, resolve } from "path"

import FastObject from "./fast-object.js"
import Module from "./module.js"
import NullObject from "./null-object.js"

import _createOptions from "./util/create-options.js"
import defaults from "./util/defaults.js"
import has from "./util/has.js"
import isFile from "./util/is-file.js"
import isObjectLike from "./util/is-object-like.js"
import loadESM from "./module/esm/load.js"
import readJSON from "./fs/read-json.js"
import readdir from "./fs/readdir.js"
import { validRange } from "semver"
import { version } from "./version.js"

const ESMRC_FILENAME = ".esmrc"
const ESMRC_JS_FILENAME = ".esmrc.js"
const PACKAGE_FILENAME = "package.json"

const { setPrototypeOf } = Object

const defaultOptions = {
  cache: true,
  cjs: createCJS(false),
  debug: false,
  esm: "mjs",
  gz: false,
  sourceMap: void 0,
  warnings: process.env.NODE_ENV !== "production"
}

const infoCache = new FastObject

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
    let pkgJSON = readJSON(resolve(dirPath, PACKAGE_FILENAME))
    let options = readJSON(resolve(dirPath, ESMRC_FILENAME))
    let range = null

    if (options) {
      options = toOptions(options)
    } else {
      const optionsPath = resolve(dirPath, ESMRC_JS_FILENAME)

      if (isFile(optionsPath)) {
        const optionsMod = loadESM(optionsPath, null, false, (mod) => {
          setPrototypeOf(mod, Module.prototype)
        })

        options = toOptions(optionsMod.exports)
      }
    }

    if (pkgJSON === null) {
      if (options) {
        const parentPkgInfo = PkgInfo.get(dirname(dirPath))

        if (parentPkgInfo) {
          range = parentPkgInfo.range
          options = defaults(PkgInfo.createOptions(options), parentPkgInfo.options)
        }
      } else if (! force) {
        return null
      }
    }

    if (options === null) {
      if (has(pkgJSON, "@std/esm")) {
        options = pkgJSON["@std/esm"]
      } else if (has(pkgJSON, "@std") && has(pkgJSON["@std"], "esm")) {
        options = pkgJSON["@std"].esm
      }
    }

    if (! force &&
        options === false) {
      // An explicit `@std/esm` property value of `false` disables ESM loading
      // even if `@std/esm` is listed as a dependency.
      return null
    }

    if (range === null) {
      // A package.json may have `@std/esm` in its "devDependencies" object
      // because it expects another package or application to enable ESM loading
      // in production, but needs `@std/esm` during development.
      range =
        getRange(pkgJSON, "dependencies") ||
        getRange(pkgJSON, "peerDependencies")
    }

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

function createCJS(value, object = {}) {
  object.cache =
  object.extensions =
  object.interop =
  object.namedExports =
  object.paths =
  object.topLevelReturn =
  object.vars = value
  return object
}

function createOptions(options) {
  let cjsOptions
  let sourceMap
  const { defaultOptions } = PkgInfo

  options = toOptions(options)

  if (has(options, "cjs")) {
    cjsOptions = typeof options.cjs === "boolean"
      ? createCJS(options.cjs, new NullObject)
      : _createOptions(options.cjs, defaultOptions.cjs)
  }

  if (has(options, "sourcemap") &&
      ! has(options, "sourceMap")) {
    sourceMap = options.sourcemap
  }

  options = _createOptions(options, defaultOptions)

  if (! options.esm) {
    options.esm = "mjs"
  }

  if (cjsOptions) {
    options.cjs = cjsOptions
  }

  if (sourceMap !== void 0) {
    options.sourceMap = !! sourceMap
    delete options.sourcemap
  }

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
