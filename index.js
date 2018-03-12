/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */
"use strict"

// Guard against mocked environments (e.g. Jest).
const useBuiltins = module.constructor.length > 1

const { defineProperty } = Reflect
const { freeze } = Object

const { versions } = process
const chakraVersion = versions.chakracore
const engineVersion = versions.v8 || chakraVersion
const nodeVersion = process.version

const { Script } = require("vm")
const { runInNewContext, runInThisContext } = Script.prototype

const {
  dirname,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} = require("fs")

const { resolve } = require("path")
const { createHash } = require("crypto")

const { filename, id } = module
const isInternal = id.startsWith("internal/")

let Module = module.constructor

if (isInternal ||
    ! useBuiltins) {
  Module = require("module")
}

const esmMod = new Module(id, null)

let esmReq = require

if (! useBuiltins &&
    typeof esmMod.require === "function") {
  esmReq = (request) => esmMod.require(request)
}

esmMod.filename = filename
esmMod.parent = module.parent

function compileESM() {
  let cachedData
  let cacheFilename
  let cachePath
  let content
  let nodeModulesPath
  let filename = "esm.js"

  if (isInternal) {
    content = process.binding("natives")["internal/esm/loader"]
  } else {
    const cacheName = md5(nodeVersion + "\0" + engineVersion) + ".blob"
    const esmDirname = typeof __dirname === "string" ? __dirname : dirname(filename)

    nodeModulesPath = resolve(esmDirname, "node_modules")
    cachePath = resolve(nodeModulesPath, ".cache")
    cacheFilename = resolve(cachePath, cacheName)
    cachedData = readFile(cacheFilename)
    filename = resolve(esmDirname, filename)
    content = readFile(resolve(esmDirname, "esm/loader.js"), "utf8")
  }

  const script = new Script(
    "(function (require, module, __shared__) { " +
    content +
    "\n});", {
    __proto__: null,
    cachedData,
    filename,
    produceCachedData: ! isInternal
  })

  let changed = false
  let scriptData = null

  const { cachedDataRejected } = script

  if (! isInternal) {
    if (script.cachedDataProduced &&
        ! cachedDataRejected) {
      changed = ! cachedData
      scriptData = script.cachedData
    } else if (cachedData &&
        cachedDataRejected) {
      changed = true
    }
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
  compiledESM(esmReq, esmMod, __shared__)
  return esmMod.exports
}

function makeRequireFunction(mod, options) {
  return loadESM()(mod, options)
}

function md5(string) {
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
