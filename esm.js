/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */

const globalThis = (function () {
  // Reference `this` before `Function()` to prevent CSP errors for unsafe-eval.
  // Fallback to `Function()` when Node is invoked with `--strict`.
  return this || Function("return this")()
})()

const {
  apply,
  defineProperty
} = Reflect

const { freeze } = Object
const { hasOwnProperty } = Object.prototype
const symbolFor = Symbol.for
const { type, versions } = process

const {
  filename,
  id,
  parent
} = module

const isElectron = has(versions, "electron")
const isElectronRenderer = isElectron && type === "renderer"

let nativeContent = ""

if (typeof id === "string" &&
    id.startsWith("internal/")) {
  nativeContent = getNativeSource("internal/esm/loader")
}

const Module = require("module")
const { Script } = require("vm")

const {
  createCachedData,
  runInNewContext,
  runInThisContext
} = Script.prototype

const { sep } = require("path")
const { readFileSync } = require("fs")

const esmModule = new Module(id)

esmModule.filename = filename
esmModule.parent = parent

let jestObject

if (typeof jest === "object" && jest !== null &&
    global.jest !== jest) {
  jestObject = jest
}

function getNativeSource(thePath) {
  let result

  try {
    const { internalBinding } = require("internal/bootstrap/loaders")
    const natives = internalBinding("natives")

    if (has(natives, thePath)) {
      result = natives[thePath]
    }
  } catch (e) {}

  return typeof result === "string"
    ? result
    : ""
}

function has(object, name) {
  return object != null &&
    apply(hasOwnProperty, object, [name])
}

function loadESM() {
  compiledESM(require, esmModule, jestObject, shared)
  return esmModule.exports
}

function makeRequireFunction(mod, options) {
  return loadESM()(mod, options)
}

function readFile(filename, options) {
  try {
    return readFileSync(filename, options)
  } catch (e) {}

  return null
}

let cachedData
let scriptOptions
let cachePath = ""
let content = ""

if (nativeContent !== "") {
  content = nativeContent

  scriptOptions = {
    __proto__: null,
    filename: "esm.js"
  }
} else {
  cachePath = __dirname + sep + "node_modules" + sep + ".cache" + sep + "esm"
  cachedData = readFile(cachePath + sep + ".data.blob")
  content = readFile(__dirname + sep + "esm" + sep + "loader.js", "utf8")

  if (cachedData === null) {
    cachedData = void 0
  }

  if (content === null) {
    content = ""
  }

  scriptOptions = {
    __proto__: null,
    cachedData,
    filename,
    produceCachedData: typeof createCachedData !== "function"
  }
}

const script = new Script(
  "var __global__ = this;" +
  "(function (require, module, __jest__, __shared__) { " +
  content +
  "\n});",
  scriptOptions
)

let compiledESM

if (isElectronRenderer) {
  compiledESM = apply(runInThisContext, script, [{
    __proto__: null,
    filename
  }])
} else {
  compiledESM = apply(runInNewContext, script, [{
    __proto__: null,
    global: globalThis
  }, {
    __proto__: null,
    filename
  }])
}

// Declare `shared` before assignment to avoid the TDZ.
let shared

shared = loadESM()

if (cachePath !== "") {
  const { dir } = shared.package

  if (! has(dir, cachePath)) {
    dir[cachePath] = {
      buffer: cachedData,
      compile: {
        __proto__: null,
        esm: {
          changed: false,
          circular: 0,
          code: null,
          codeWithTDZ: null,
          filename: null,
          firstAwaitOutsideFunction: null,
          mtime: -1,
          scriptData: cachedData || null,
          sourceType: 1,
          yieldIndex: -1
        }
      },
      map: { __proto__: null }
    }
  }

  shared.pendingScripts[cachePath] = {
    __proto__: null,
    esm: script
  }
}

// The legacy symbol used for `esm` export detection.
defineProperty(makeRequireFunction, shared.symbol.package, {
  __proto__: null,
  value: true
})

defineProperty(makeRequireFunction, shared.customInspectKey, {
  __proto__: null,
  value: () => "esm enabled"
})

defineProperty(makeRequireFunction, symbolFor("esm:package"), {
  __proto__: null,
  value: true
})

freeze(makeRequireFunction)

module.exports = makeRequireFunction
