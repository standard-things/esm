/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */
"use strict"

const { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } = require("fs")
const { Script } = require("vm")
const { createHash } = require("crypto")
const { inspect } = require("util")
const { resolve } = require("path")

// Guard against mocked environments (e.g. Jest).
const useBuiltins = module.constructor.length > 1

const { versions } = process
const chakraVersion = versions.chakracore
const engineVersion = versions.v8 || chakraVersion
const nodeVersion = process.version

const { defineProperty } = Reflect
const { freeze } = Object
const { runInNewContext, runInThisContext } = Script.prototype

const Module = useBuiltins ? module.constructor : require("module")
const esmMod = new Module(module.id, null)
const esmReq = useBuiltins ? require : (request) => esmMod.require(request)

esmMod.filename = __filename
esmMod.parent = module.parent

function compileESM() {
  const nodeModulesPath = resolve(__dirname, "node_modules")
  const cacheName = md5(nodeVersion + "\0" + engineVersion) + ".blob"
  const cachePath = resolve(nodeModulesPath, ".cache")
  const cacheFilename = resolve(cachePath, cacheName)
  const cachedData = readFile(cacheFilename)
  const filename = resolve(__dirname, "esm.js")

  const script = new Script(
    "(function(require,module,__shared__){" +
    readFile(filename, "utf8") +
    "\n})", {
    __proto__: null,
    cachedData,
    filename,
    produceCachedData: true
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

  const options = { __proto__: null, filename }

  return chakraVersion
    ? runInThisContext.call(script, options)
    : runInNewContext.call(script, { __proto__: null, global }, options)
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
const inspectKey = inspect.custom || "inspect"

let __shared__

__shared__ = loadESM()
__shared__.global = global

defineProperty(makeRequireFunction, inspectKey, {
  __proto__: null,
  value: () => "@std/esm enabled"
})

freeze(makeRequireFunction)

module.exports = makeRequireFunction
