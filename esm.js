/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */
"use strict"

const {
  apply,
  defineProperty,
  has
} = Reflect

const { freeze } = Object
const { type, versions } = process
const { filename, id } = module

const isChakra = has(versions, "chakracore")
const isElectron = has(versions, "electron")
const isElectronRenderer = isElectron && type === "renderer"

const bootstrap = id.startsWith("internal/")
  ? safeRequire("internal/bootstrap/loaders")
  : void 0

const { Script } = require("vm")

const {
  createCachedData,
  runInNewContext,
  runInThisContext
} = Script.prototype

const { sep } = require("path")

const {
  Stats,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} = require("fs")

const { isFile } = Stats.prototype

const useBuiltinRequire = module.constructor.length > 1
const useCreateCachedData = typeof createCachedData === "function"

const Module = require("module")
const NativeModule = bootstrap && bootstrap.NativeModule

const esmModule = new Module(id)

esmModule.filename = filename
esmModule.parent = module.parent

let esmRequire = require

if (! useBuiltinRequire &&
    ! NativeModule &&
    typeof esmModule.require === "function") {
  esmRequire = (request) => esmModule.require(request)
}

let freeJest

if (typeof jest === "object" && jest !== null &&
    global.jest !== jest) {
  freeJest = jest
}

function compileESM() {
  let cachedData
  let cacheFilename
  let cachePath
  let content
  let filename = "esm.js"

  if (NativeModule) {
    content = NativeModule._source["internal/esm/loader"]
  } else {
    const loaderPath = __dirname + sep + "esm" + sep + "loader.js"

    cachePath = __dirname + sep + "node_modules" + sep + ".cache" + sep + "esm"
    cacheFilename = cachePath + sep + ".loader.blob"
    cachedData = readFile(cacheFilename)
    content = readFile(loaderPath, "utf8")
    filename = __dirname + sep + filename
  }

  let scriptOptions

  if (NativeModule ||
      useCreateCachedData) {
    scriptOptions = {
      __proto__: null,
      cachedData,
      filename
    }
  } else {
    scriptOptions = {
      __proto__: null,
      cachedData,
      filename,
      produceCachedData: true
    }
  }

  const script = new Script(
    "(function (require, module, __jest__, __shared__) { " +
    content +
    "\n});",
    scriptOptions
  )

  const options = {
    __proto__: null,
    filename
  }

  let result

  if (isChakra ||
      isElectronRenderer) {
    result = apply(runInThisContext, script, [options])
  } else {
    result = apply(runInNewContext, script, [{
      __proto__: null,
      global: Function("return this")()
    }, options])
  }

  let scriptData

  if (! NativeModule &&
      ! cachedData) {
    scriptData = useCreateCachedData
      ? apply(createCachedData, script, [])
      : script.cachedData
  }

  let changed = false

  if ((scriptData &&
       scriptData.length) ||
      (cachedData &&
       script.cachedDataRejected)) {
    changed = true
  }

  if (changed) {
    if (scriptData) {
      if (mkdirp(cachePath)) {
        writeFile(cacheFilename, scriptData)
      }
    } else {
      removeFile(cacheFilename)
    }
  }

  return result
}

function loadESM() {
  compiledESM(esmRequire, esmModule, freeJest, shared)
  return esmModule.exports
}

function makeRequireFunction(mod, options) {
  return loadESM()(mod, options)
}

function mkdir(dirPath) {
  try {
    mkdirSync(dirPath)
    return true
  } catch (e) {}

  return false
}

function mkdirp(dirPath) {
  const paths = []

  while (true) {
    if (stat(dirPath) === 1) {
      break
    }

    paths.push(dirPath)

    const lastIndex = dirPath.lastIndexOf(sep)
    const parentPath = lastIndex === -1 ? "." : dirPath.slice(0, lastIndex)

    if (dirPath === parentPath) {
      break
    }

    dirPath = parentPath
  }

  let { length } = paths

  while (length--) {
    if (! mkdir(paths[length])) {
      return false
    }
  }

  return true
}

function readFile(filename, options) {
  try {
    return readFileSync(filename, options)
  } catch (e) {}
}

function removeFile(filename) {
  try {
    return unlinkSync(filename)
  } catch (e) {}
}

function safeRequire(request) {
  try {
    return require(request)
  } catch (e) {}
}

function stat(thePath) {
  try {
    return apply(isFile, statSync(thePath), []) ? 0 : 1
  } catch (e) {}

  return -1
}

function writeFile(filename, options) {
  try {
    return writeFileSync(filename, options)
  } catch (e) {}
}

const compiledESM = compileESM()

// Declare `shared` before assignment to avoid the TDZ.
let shared

shared = loadESM()

defineProperty(makeRequireFunction, shared.symbol.package, {
  __proto__: null,
  value: true
})

defineProperty(makeRequireFunction, shared.customInspectKey, {
  __proto__: null,
  value: () => "esm enabled"
})

freeze(makeRequireFunction)

module.exports = makeRequireFunction
