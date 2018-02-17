/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const util = require("util")
const vm = require("vm")

// Guard against mocked environments (e.g. Jest).
const useBuiltins = module.constructor.length > 1

const Script = vm.Script

const engineVersion =
  process.versions.v8 ||
  process.versions.chakracore

const nodeVersion = process.version

const createContext = vm.createContext
const defineProperty = Object.defineProperty
const freeze = Object.freeze
const inspectKey = util.inspect.custom || "inspect"
const readFileSync = fs.readFileSync
const resolve = path.resolve
const runInContext = Script.prototype.runInContext
const writeFileSync = fs.writeFileSync

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
  const context = createContext({ global })
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

  if (script.cachedDataProduced &&
      ! script.cachedDataRejected) {
    if (! fs.existsSync(nodeModulesPath)) {
      fs.mkdirSync(nodeModulesPath)
      fs.mkdirSync(cachePath)
    }

    writeFile(cacheFilename, script.cachedData)
  }

  return runInContext.call(script, context, {
    __proto__: null,
    filename
  })
}

function loadESM() {
  compiledESM(esmReq, esmMod, __shared__)
  return esmMod.exports
}

function makeRequireFunction(mod, options) {
  return loadESM()(mod, options)
}

function md5(string) {
  return crypto
    .createHash("md5")
    .update(string)
    .digest("hex")
}

function readFile(filename, options) {
  try {
    return readFileSync(filename, options)
  } catch (e) {}
}

function writeFile(filename, options) {
  try {
    return writeFileSync(filename, options)
  } catch (e) {}
}

const compiledESM = compileESM()

let __shared__

__shared__ = loadESM()
__shared__.global = global

defineProperty(makeRequireFunction, inspectKey, {
  __proto__: null,
  value: () => "@std/esm enabled"
})

freeze(makeRequireFunction)

module.exports = makeRequireFunction
