import { basename, dirname , extname, resolve } from "path"

import CHAR_CODE from "./constant/char-code.js"

import _findPath from "./module/_find-path.js"
import getEnvVars from "./env/get-vars.js"
import getModuleDirname from "./util/get-module-dirname.js"
import has from "./util/has.js"
import isFile from "./util/is-file.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import loadESM from "./module/esm/load.js"
import moduleState from "./module/state.js"
import parseJSON from "./util/parse-json.js"
import parseJSON6 from "./util/parse-json6.js"
import readFile from "./fs/read-file.js"
import readFileFast from "./fs/read-file-fast.js"
import readJSON from "./fs/read-json.js"
import readJSON6 from "./fs/read-json6.js"
import readdir from "./fs/readdir.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import toNullObject from "./util/to-null-object.js"
import { validRange } from "semver"
import { version } from "./version.js"

const {
  PERIOD
} = CHAR_CODE

const ESMRC_FILENAME = ".esmrc"
const PACKAGE_FILENAME = "package.json"

const ExBuffer = __external__.Buffer

const defaultOptions = {
  __proto__: null,
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
  mode: "mjs",
  sourceMap: void 0,
  warnings: (process.env && process.env.NODE_ENV) !== "production"
}

const defaultCJS = defaultOptions.cjs
const cacheKey = JSON.stringify(defaultOptions)
const cjsKeys = keys(defaultCJS)
const searchExts = [".mjs", ".js", ".json"]

class Package {
  static cache =
    shared.package.cache[cacheKey] ||
    (shared.package.cache[cacheKey] = { __proto__: null })

  static createOptions = createOptions
  static defaultOptions = defaultOptions

  constructor(dirPath, range, options) {
    dirPath = dirPath === "" ? dirPath : resolve(dirPath)
    options = Package.createOptions(options)

    let cachePath

    if (typeof options.cache === "string") {
      cachePath = resolve(dirPath, options.cache)
    } else if (options.cache !== false) {
      cachePath = resolve(dirPath, "node_modules/.cache/@std/esm")
    } else {
      cachePath = ""
    }

    const { dir } = shared.package
    let cache = dir[cachePath]

    if (! cache) {
      cache =
      dir[cachePath] = { __proto__: null }

      let compileCache =
      cache.compile = { __proto__: null }

      if (cachePath) {
        let hasBuffer
        let hasMap

        const cacheNames = readdir(cachePath)

        for (const cacheName of cacheNames) {
          if (cacheName.charCodeAt(0) !== PERIOD) {
            // Later, we'll change the cached value to its associated compiler result,
            // but for now we merely register that a cache file exists.
            compileCache[cacheName] = true
          } else if (cacheName === ".data.blob") {
            hasBuffer = true
          } else if (cacheName === ".data.json") {
            hasMap = true
          } else if (cacheName === ".dirty") {
            compileCache = { __proto__: null }
            hasBuffer =
            hasMap = false
            cleanCache(cachePath)
            break
          }
        }

        cache.buffer = hasBuffer
          ? readFile(resolve(cachePath, ".data.blob"))
          : new ExBuffer(0)

        cache.map = hasMap
          ? readJSON(resolve(cachePath, ".data.json"))
          : {}
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
    return getInfo(dirPath, force) || shared.package.default
  }

  static from(mod, force) {
    return Package.get(getModuleDirname(mod), force)
  }

  static set(dirPath, pkg) {
    dirPath = dirPath === "" ? dirPath : resolve(dirPath)
    Package.cache[dirPath] = pkg || null
  }
}

function cleanCache(cachePath) {
  removeFile(resolve(cachePath, ".dirty"))

  const babelCachePath = resolve(cachePath, "../../@babel/register")
  const cacheNames = readdir(babelCachePath)

  for (const cacheName of cacheNames) {
    if (cacheName.startsWith(".babel.") &&
        extname(cacheName) === ".json") {
      removeFile(resolve(babelCachePath, cacheName))
    }
  }
}

function createCJS(source) {
  const object = { __proto__: null }

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

  if (has(options, "mode") &&
      options.mode === "cjs") {
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

  options = toNullObject(options, Package.defaultOptions)

  if (typeof options.cache !== "string") {
    options.cache = !! options.cache
  }

  if (cjsOptions) {
    options.cjs = cjsOptions
  }

  if (esmMode) {
    options.mode = esmMode
  } else if (options.mode !== "all" &&
      options.mode !== "js") {
    options.mode = "mjs"
  }

  if (sourceMap !== void 0) {
    options.sourceMap = !! sourceMap
    Reflect.deleteProperty(options, "sourcemap")
  }

  options.debug = !! options.debug
  options.warnings = !! options.warnings

  return options
}

function getInfo(dirPath, force) {
  let pkg

  if (dirPath in Package.cache) {
    pkg = Package.cache[dirPath]

    if (! force ||
        pkg) {
      return pkg
    }
  }

  if (basename(dirPath) === "node_modules") {
    return Package.cache[dirPath] = null
  }

  pkg = readInfo(dirPath)

  if (pkg === null) {
    const parentPath = dirname(dirPath)

    if (parentPath !== dirPath) {
      pkg = getInfo(parentPath)
    }
  }

  if (force &&
      pkg === null) {
    pkg = readInfo(dirPath, force)
  }

  return Package.cache[dirPath] = pkg
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

function getRoot(dirPath) {
  const { root } = shared.package
  const cached = root[dirPath]

  if (cached) {
    return cached
  }

  if (basename(dirPath) === "node_modules" ||
      isFile(resolve(dirPath, PACKAGE_FILENAME))) {
    return root[dirPath] = dirPath
  }

  const parentPath = dirname(dirPath)

  if (parentPath === dirPath ||
      basename(parentPath) === "node_modules") {
    return root[dirPath] = dirPath
  }

  const ancestorPath = getRoot(parentPath)

  return root[dirPath] = ancestorPath === dirname(ancestorPath)
    ? dirPath
    : ancestorPath
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
        mode: "js"
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
      parentPkg = getInfo(dirname(dirPath))
    } else {
      return null
    }
  }

  if (! optionsFound &&
      pkgJSON !== null) {
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
    if (! pkgParsed &&
        pkgJSON !== null) {
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

  if (! pkgParsed &&
      pkgJSON === null) {
    dirPath = getRoot(dirPath)
  }

  return new Package(dirPath, range, options)
}

function toOptions(value) {
  if (typeof value === "string") {
    return value === "cjs"
      ? { cjs: true, mode: "js" }
      : { mode: value }
  }

  return isObjectLike(value) ? value : {}
}

Reflect.setPrototypeOf(Package.prototype, null)

// Enable in-memory caching when compiling without a file path.
Package.cache[""] = new Package("", version, {
  cache: false,
  mode: "cjs"
})

export default Package
