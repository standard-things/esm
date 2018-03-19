/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */
"use strict"

const { defineProperty } = Reflect
const { freeze } = Object

const { versions } = process
const chakraVersion = versions.chakracore
const engineVersion = versions.v8 || chakraVersion
const nodeVersion = process.version

const { filename, id } = module
const bootstrap = id.startsWith("internal/")
  ? safeRequire("internal/bootstrap/loaders")
  : void 0

const { Script } = require("vm")
const { runInNewContext, runInThisContext } = Script.prototype

const {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} = require("fs")

const { resolve } = require("path")

const Module = require("module")
const NativeModule = bootstrap && bootstrap.NativeModule

const esmModule = new Module(id, null)
const useBuiltins = module.constructor.length > 1

esmModule.filename = filename
esmModule.parent = module.parent

let createHash
let esmRequire = require

if (! useBuiltins &&
    ! NativeModule &&
    typeof esmModule.require === "function") {
  esmRequire = (request) => esmModule.require(request)
}

function compileESM() {
  let cachedData
  let cacheFilename
  let cachePath
  let content
  let nodeModulesPath
  let filename = "esm.js"

  if (NativeModule) {
    content = NativeModule._source["internal/esm/loader"]
  } else {
    const cacheName = md5(nodeVersion + "\0" + engineVersion) + ".blob"
    const loaderPath = resolve(__dirname, "esm/loader.js")

    nodeModulesPath = resolve(__dirname, "node_modules")
    cachePath = resolve(nodeModulesPath, ".cache")
    cacheFilename = resolve(cachePath, cacheName)
    cachedData = readFile(cacheFilename)
    content = readFile(loaderPath, "utf8")
    filename = resolve(__dirname, filename)
  }

  const script = new Script(
    "(function (require, module, __shared__) { " +
    content +
    "\n});", {
    __proto__: null,
    cachedData,
    filename,
    produceCachedData: ! NativeModule
  })

  let changed = false
  let scriptData = null

  const { cachedDataRejected } = script

  if (script.cachedDataProduced &&
      ! cachedDataRejected) {
    changed = ! cachedData
    scriptData = script.cachedData
  } else if (cachedData &&
      cachedDataRejected) {
    changed = true
  }

  if (changed) {
    if (scriptData) {
      let canWrite = false

      if (existsSync(nodeModulesPath)) {
        canWrite = true
      } else if (mkdir(nodeModulesPath) &&
          mkdir(cachePath)) {
        canWrite = true
      }

      if (canWrite) {
        writeFile(cacheFilename, scriptData)
      }
    } else {
      removeFile(cacheFilename)
    }
  }

  const options = {
    __proto__: null,
    filename
  }

  if (chakraVersion) {
    return runInThisContext.call(script, options)
  }

  const context = {
    __proto__: null,
    global
  }

  return runInNewContext.call(script, context, options)
}

function loadESM() {
  compiledESM(esmRequire, esmModule, __shared__)
  return esmModule.exports
}

function makeRequireFunction(mod, options) {
  return loadESM()(mod, options)
}

function md5(string) {
  if (! createHash) {
    createHash = require("crypto").createHash
  }

  return createHash("md5")
    .update(string)
    .digest("hex")
}

function mkdir(dirPath) {
  try {
    mkdirSync(dirPath)
    return true
  } catch (e) {}

  return false
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

function writeFile(filename, options) {
  try {
    return writeFileSync(filename, options)
  } catch (e) {}
}

const compiledESM = compileESM()

// Declare `__shared__` before assignment to avoid the TDZ.
let __shared__

__shared__ = loadESM()

defineProperty(makeRequireFunction, __shared__.symbol.package, {
  __proto__: null,
  value: true
})

defineProperty(makeRequireFunction, __shared__.customInspectKey, {
  __proto__: null,
  value: () => "esm enabled"
})

freeze(makeRequireFunction)

module.exports = makeRequireFunction
