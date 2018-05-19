import { basename, dirname , extname, resolve, sep } from "./safe/path.js"

import CHAR_CODE from "./constant/char-code.js"
import ENV from "./constant/env.js"
import PACKAGE from "./constant/package.js"

import GenericBuffer from "./generic/buffer.js"

import _findPath from "./module/_find-path.js"
import assign from "./util/assign.js"
import defaults from "./util/defaults.js"
import errors from "./errors.js"
import getModuleDirname from "./util/get-module-dirname.js"
import has from "./util/has.js"
import isFile from "./util/is-file.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import loadESM from "./module/esm/load.js"
import parseJSON from "./util/parse-json.js"
import parseJSON6 from "./util/parse-json6.js"
import readFile from "./fs/read-file.js"
import readFileFast from "./fs/read-file-fast.js"
import readJSON from "./fs/read-json.js"
import readJSON6 from "./fs/read-json6.js"
import readdir from "./fs/readdir.js"
import removeFile from "./fs/remove-file.js"
import shared from "./shared.js"
import toStringLiteral from "./util/to-string-literal.js"
import { validRange } from "semver"
import { version } from "./version.js"

const {
  DOT
} = CHAR_CODE

const {
  DEVELOPMENT,
  OPTIONS,
  NYC
} = ENV

const {
  OPTIONS_MODE_ALL,
  OPTIONS_MODE_AUTO,
  OPTIONS_MODE_STRICT,
  RANGE_ALL
} = PACKAGE

const {
  ERR_INVALID_ESM_MODE,
  ERR_UNKNOWN_ESM_OPTION
} = errors

const ESMRC_FILENAME = ".esmrc"
const PACKAGE_FILENAME = "package.json"

const defaultOptions = {
  await: false,
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
  mode: "strict",
  sourceMap: void 0,
  warnings: DEVELOPMENT
}

const autoOptions = {
  cjs: {
    cache: true,
    extensions: true,
    interop: true,
    namedExports: true,
    paths: true,
    topLevelReturn: false,
    vars: true
  },
  mode: "auto"
}

const cacheKey = JSON.stringify(defaultOptions)
const searchExts = [".mjs", ".js", ".json"]

class Package {
  static state =
    shared.package.state[cacheKey] ||
    (shared.package.state[cacheKey] = {
      cache: { __proto__: null },
      default: null
    })

  static createOptions = createOptions
  static defaultOptions = defaultOptions

  constructor(dirPath, range, options) {
    options = Package.createOptions(options)

    let cachePath

    if (typeof options.cache === "string") {
      cachePath = resolve(dirPath, options.cache)
    } else if (options.cache !== false) {
      cachePath = dirPath + sep + "node_modules" + sep + ".cache" + sep + "esm"
    } else {
      cachePath = ""
    }

    const { dir } = shared.package

    let cache = dir[cachePath]

    if (! cache) {
      cache =
      dir[cachePath] = {
        buffer: null,
        compile: null,
        map: null
      }

      let compileCache = { __proto__: null }

      if (cachePath) {
        const cacheNames = readdir(cachePath)

        let hasBuffer = false
        let hasDirtyMarker = false
        let hasMap = false
        let hasNycMarker = false

        for (const cacheName of cacheNames) {
          if (cacheName.charCodeAt(0) !== DOT) {
            // Later, we'll change the cached value to its associated compiler result,
            // but for now we merely register that a cache file exists.
            compileCache[cacheName] = true
          } else if (cacheName === ".data.blob") {
            hasBuffer = true
          } else if (cacheName === ".data.json") {
            hasMap = true
          } else if (cacheName === ".dirty") {
            hasDirtyMarker = true
            break
          } else if (cacheName === ".nyc") {
            hasNycMarker = true
          }
        }

        if (hasDirtyMarker ||
            (NYC &&
             ! hasNycMarker)) {
          compileCache = { __proto__: null }
          hasBuffer =
          hasMap = false
        }

        if (hasDirtyMarker) {
          cleanCache()
        }

        cache.buffer = hasBuffer
          ? readFile(cachePath + sep + ".data.blob")
          : GenericBuffer.alloc(0)

        cache.map = hasMap
          ? readJSON(cachePath + sep + ".data.json")
          : {}
      }

      cache.compile = compileCache
    }

    this.cache = cache
    this.cachePath = cachePath
    this.dirPath = dirPath
    this.options = options
    this.range = range
  }

  static get(dirPath, force) {
    return getInfo(dirPath, force) || Package.state.default
  }

  static from(mod, force) {
    return Package.get(getModuleDirname(mod), force)
  }

  static set(dirPath, pkg) {
    Package.state.cache[dirPath] = pkg || null
  }
}

function cleanCache(cachePath) {
  removeFile(cachePath + sep + ".dirty")

  const babelCachePath = resolve(cachePath, "../@babel/register")
  const cacheNames = readdir(babelCachePath)

  for (const cacheName of cacheNames) {
    if (extname(cacheName) === ".json") {
      removeFile(babelCachePath + sep + cacheName)
    }
  }
}

function createCJS(value) {
  const defaultCJS = Package.defaultOptions.cjs
  const options = {}

  if (value === void 0) {
    return assign(options, defaultCJS)
  }

  if (isObjectLike(value)) {
    const possibleNames = keys(value)

    for (const name of possibleNames) {
      if (Reflect.has(defaultCJS, name)) {
        options[name] = !! value[name]
      } else {
        throw new ERR_UNKNOWN_ESM_OPTION("cjs[" + toStringLiteral(name) + "]")
      }
    }

    return defaults(options, defaultCJS)
  }

  const names = keys(defaultCJS)
  const optionsValue = !! value

  for (const name of names) {
    options[name] = optionsValue
  }

  return options
}

function createOptions(value) {
  const { defaultOptions } = Package
  const names = []

  let options = {}

  if (typeof value === "string") {
    names.push("mode")
    options.mode = value
  } else {
    const possibleNames = keys(value)

    for (const name of possibleNames) {
      if (Reflect.has(defaultOptions, name)) {
        names.push(name)
        options[name] = value[name]
      } else if (name === "sourcemap" &&
          possibleNames.indexOf("sourceMap") === -1) {
        const { sourcemap } = value

        if (sourcemap !== void 0) {
          names.push("sourceMap")
          options.sourceMap = !! sourcemap
        }
      } else {
        throw new ERR_UNKNOWN_ESM_OPTION(name)
      }
    }
  }

  if (names.indexOf("cjs") === -1) {
    options.cjs = autoOptions.cjs
  }

  if (names.indexOf("mode") === -1) {
    options.mode = autoOptions.mode
  }

  const cjsOptions = createCJS(options.cjs)

  defaults(options, defaultOptions)
  options.cjs = cjsOptions

  const { mode } = options

  if (mode === "all") {
    options.mode = OPTIONS_MODE_ALL
  } else if (mode === "auto") {
    options.mode = OPTIONS_MODE_AUTO
  } else if (mode === "strict") {
    options.mode = OPTIONS_MODE_STRICT
  } else {
    throw new ERR_INVALID_ESM_MODE(mode)
  }

  if (typeof options.cache !== "string") {
    options.cache = !! options.cache
  }

  options.debug = !! options.debug
  options.warnings = !! options.warnings

  return options
}

function findRoot(dirPath) {
  if (basename(dirPath) === "node_modules" ||
      isFile(dirPath + sep + PACKAGE_FILENAME)) {
    return dirPath
  }

  const parentPath = dirname(dirPath)

  if (parentPath === dirPath) {
    return ""
  }

  return basename(parentPath) === "node_modules"
    ? dirPath
    : findRoot(parentPath)
}

function getInfo(dirPath, force) {
  let pkg

  if (Reflect.has(Package.state.cache, dirPath)) {
    pkg = Package.state.cache[dirPath]

    if (! force ||
        pkg) {
      return pkg
    }
  }

  if (basename(dirPath) === "node_modules") {
    return Package.state.cache[dirPath] = null
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

  return Package.state.cache[dirPath] = pkg
}

function getRange(json, name) {
  if (has(json, name)) {
    const object = json[name]

    if (has(object, "esm")) {
      return validRange(object["esm"])
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

  return root[dirPath] = findRoot(dirPath) || dirPath
}

function readInfo(dirPath, force) {
  let optionsPath
  let pkg

  let options = readFile(dirPath + sep + ESMRC_FILENAME, "utf8")
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
      const { moduleState } = shared
      const { parseOnly, parsing } = moduleState

      moduleState.parseOnly =
      moduleState.parsing = false

      pkg =
      Package.state.cache[dirPath] = new Package(dirPath, RANGE_ALL)

      try {
        pkg.options =
        Package.createOptions(loadESM(optionsPath, null, false).module.exports)
      } finally {
        moduleState.parseOnly = parseOnly
        moduleState.parsing = parsing
      }
    }
  }

  let parentPkg
  let pkgParsed = false
  let pkgJSON = readFileFast(dirPath + sep + PACKAGE_FILENAME, "utf8")

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

    if (has(pkgJSON, "esm")) {
      optionsFound = true
      options = pkgJSON["esm"]
    }
  }

  let range

  if (force) {
    range = RANGE_ALL
  } else if (parentPkg) {
    range = parentPkg.range
  } else {
    if (! pkgParsed &&
        pkgJSON !== null) {
      pkgParsed = true
      pkgJSON = parseJSON(pkgJSON)
    }

    // A package.json may have `esm` in its "devDependencies" object because
    // it expects another package or application to enable ESM loading in
    // production, but needs `esm` during development.
    range =
      getRange(pkgJSON, "dependencies") ||
      getRange(pkgJSON, "peerDependencies")

    if (range === null) {
      if (optionsFound ||
          getRange(pkgJSON, "devDependencies")) {
        range = RANGE_ALL
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
    options = OPTIONS
  }

  if (! pkgParsed &&
      pkgJSON === null) {
    dirPath = getRoot(dirPath)
  }

  return new Package(dirPath, range, options)
}

Reflect.setPrototypeOf(Package.prototype, null)

// Enable in-memory caching when compiling without a file path.
Package.state.cache[""] = new Package("", version, {
  cache: false,
  cjs: true
})

export default Package
