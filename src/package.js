import { basename, dirname , extname, resolve } from "path"

import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"

import _createOptions from "./util/create-options.js"
import _findPath from "./module/_find-path.js"
import getEnvVars from "./env/get-vars.js"
import getModuleDirname from "./util/get-module-dirname.js"
import has from "./util/has.js"
import isObjectLike from "./util/is-object-like.js"
import loadESM from "./module/esm/load.js"
import moduleState from "./module/state.js"
import parseJSON from "./util/parse-json.js"
import parseJSON6 from "./util/parse-json6.js"
import readFile from "./fs/read-file.js"
import readFileFast from "./fs/read-file-fast.js"
import readJSON6 from "./fs/read-json6.js"
import readdir from "./fs/readdir.js"
import shared from "./shared.js"
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
  warnings: (process.env && process.env.NODE_ENV) !== "production"
}

const defaultCJS = defaultOptions.cjs
const cacheKey = JSON.stringify(defaultOptions)
const cjsKeys = Object.keys(defaultCJS)
const searchExts = [".mjs", ".js", ".json", ".gz", ".mjs.gz", ".js.gz"]

class Package {
  static cache =
    shared.package[cacheKey] ||
    (shared.package[cacheKey] = new FastObject)

  static createOptions = createOptions
  static defaultOptions = defaultOptions
  static default = null

  constructor(dirPath, range, options) {
    dirPath = dirPath === "" ? dirPath : resolve(dirPath)
    options = Package.createOptions(options)

    let cachePath = null

    if (typeof options.cache === "string") {
      cachePath = resolve(dirPath, options.cache)
    } else if (options.cache !== false) {
      cachePath = resolve(dirPath, "node_modules/.cache/@std/esm")
    }

    const cache = new NullObject
    const cacheNames = readdir(cachePath)

    if (cacheNames) {
      for (const cacheName of cacheNames) {
        // Later, in the ".js" or ".mjs" compiler, we'll change the cached value
        // to its associated mocked compiler result, but for now we merely register
        // that a cache file exists.
        cache[cacheName] = true
      }
    }

    this.cache = cache
    this.cachePath = cachePath
    this.dirPath = dirPath
    this.options = options
    this.range = range
  }

  static get(dirPath, force) {
    dirPath = dirPath === "" ? dirPath : resolve(dirPath)

    let pkg

    if (dirPath in Package.cache) {
      pkg = Package.cache[dirPath]

      if (! force ||
          pkg) {
        return pkg
      }
    }

    if (basename(dirPath) === "node_modules") {
      return Package.cache[dirPath] = force
        ? readInfo(dirPath, true)
        : null
    }

    pkg = readInfo(dirPath)

    if (pkg === null) {
      const parentPath = dirname(dirPath)
      pkg = parentPath === dirPath ? null : Package.get(parentPath)
    }

    const defaultPkg = Package.default

    if (pkg === null &&
        defaultPkg) {
      pkg = defaultPkg
    }

    if (force &&
        pkg === null) {
      pkg = readInfo(dirPath, force)
    }

    return Package.cache[dirPath] = pkg
  }

  static from(mod, force) {
    return Package.get(getModuleDirname(mod), force)
  }

  static set(dirPath, pkg) {
    dirPath = dirPath === "" ? dirPath : resolve(dirPath)
    Package.cache[dirPath] = pkg
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
  let esmMode
  let sourceMap

  options = toOptions(options)

  const hasCJS = has(options, "cjs")

  if (has(options, "esm") &&
      options.esm === "cjs") {
    esmMode = "js"

    if (! hasCJS) {
      cjsOptions = createCJS(true)
    }
  }

  if (hasCJS) {
    cjsOptions = createCJS(options.cjs)
  }

  if (has(options, "sourceMap")) {
    sourceMap = options.sourceMap
  } else if (has(options, "sourcemap")) {
    sourceMap = options.sourcemap
  }

  options = _createOptions(options, Package.defaultOptions)

  if (typeof options.cache !== "string") {
    options.cache = !! options.cache
  }

  if (cjsOptions) {
    options.cjs = cjsOptions
  }

  if (esmMode) {
    options.esm = esmMode
  } else if (options.esm !== "all" &&
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

function readInfo(dirPath, force) {
  let optionsPath
  let pkg

  let options = readFile(resolve(dirPath, ESMRC_FILENAME), "utf8")
  let optionsFound = options !== null

  if (optionsFound) {
    options = parseJSON6(options)
  } else {
    optionsPath = _findPath(ESMRC_FILENAME, [dirPath], false, searchExts)
  }

  if (optionsPath) {
    optionsFound = true

    if (extname(optionsPath) === ".json") {
      options = readJSON6(optionsPath)
    } else {
      pkg =
      Package.cache[dirPath] = new Package(dirPath, "*", {
        cjs: true,
        esm: "js",
        gz: true
      })

      const { parsing, passthru } = moduleState

      moduleState.parsing =
      moduleState.passthru = false

      try {
        pkg.options =
        Package.createOptions(loadESM(optionsPath, null, false).module.exports)
      } finally {
        moduleState.parsing = parsing
        moduleState.passthru = passthru
      }
    }
  }

  let parentPkg
  let pkgParsed = false
  let pkgJSON = readFileFast(resolve(dirPath, PACKAGE_FILENAME), "utf8")

  if (! force &&
      pkgJSON === null) {
    if (optionsFound) {
      parentPkg = Package.get(dirname(dirPath))
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
    } else if (has(pkgJSON, "@std") &&
        has(pkgJSON["@std"], "esm")) {
      optionsFound = true
      options = pkgJSON["@std"].esm
    }
  }

  let range

  if (force) {
    range = "*"
  } else if (parentPkg) {
    range = parentPkg.range
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

  if (pkg) {
    pkg.range = range
    return pkg
  }

  if (options === true ||
      ! optionsFound) {
    options = getEnvVars().ESM_OPTIONS
  }

  return new Package(dirPath, range, options)
}

function toOptions(value) {
  if (typeof value === "string") {
    return value === "cjs"
      ? { cjs: true, esm: "js" }
      : { esm: value }
  }

  return isObjectLike(value) ? value : {}
}

Object.setPrototypeOf(Package.prototype, null)

// Enable in-memory caching when compiling without a file path.
Package.cache[""] = new Package("", version, {
  cache: false,
  esm: "cjs",
  gz: true
})

export default Package
