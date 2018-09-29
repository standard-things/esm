/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */

const JEST_EVAL_RESULT_VARIABLE = "Object.<anonymous>"

const globalThis = (function () {
  return this || Function("return this")()
})()

const {
  apply,
  defineProperty,
  has
} = Reflect

const { freeze } = Object
const { type, versions } = process

const {
  filename,
  id,
  parent
} = module

const isChakra = has(versions, "chakracore")
const isElectron = has(versions, "electron")
const isElectronRenderer = isElectron && type === "renderer"

let nativeContent

if (id.startsWith("internal/")) {
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

let jestLoader
let jestObject

if (typeof jest === "object" && jest !== null &&
    global.jest !== jest) {
  jestObject = jest
}

function getNativeSource(thePath) {
  try {
    return require("internal/bootstrap/loaders").NativeModule._source[thePath]
  } catch (e) {}
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
}

function tryRequire(request) {
  try {
    return require(request)
  } catch (e) {}
}


const jestEnvironmentHooks = { __proto__: null }

function jestTransform(content, filename, { cwd, testEnvironment }) {

  if (! jestEnvironmentHooks[cwd]) {
    jestEnvironmentHooks[cwd] = {
      loader: makeRequireFunction(module)
    }
  }

  const Environment = tryRequire(testEnvironment)

  if (typeof Environment !== "function") {
    return
  }

  const { loader } = jestEnvironmentHooks[cwd]
  const { runScript } = Environment.prototype
  const runtimeName = "_"
  const { symbol } = shared

  const { CachingCompiler } = shared.module
  const Entry = loader(symbol.entry)
  const Runtime = loader(symbol.runtime)

  const compileData = CachingCompiler.compile(content, {
    filename,
    runtimeName,
    sourceType: 3
  })

  const code =
    "const " + runtimeName + "=exports;" +
    compileData.code

  if (! jestEnvironmentHooks[cwd][testEnvironment]) {
    jestEnvironmentHooks[testEnvironment] = true

    Environment.prototype.runScript = function (...args) {
      const result = Reflect.apply(runScript, this, args)
      const wrapper = result[JEST_EVAL_RESULT_VARIABLE]

      result[JEST_EVAL_RESULT_VARIABLE] = function (...args) {
        const [mod] = args
        const entry = Entry.get(mod)

        entry.runtimeName = runtimeName
        Runtime.enable(entry, {})
        return Reflect.apply(wrapper, this, args)
      }

      return result
    }
  }

  return { code }
}

let cachedData
let cachePath
let content
let scriptOptions

if (nativeContent) {
  content = nativeContent

  scriptOptions = {
    __proto__: null,
    filename: "esm.js"
  }
} else {
  cachePath = __dirname + sep + "node_modules" + sep + ".cache" + sep + "esm"
  cachedData = readFile(cachePath + sep + ".data.blob")
  content = readFile(__dirname + sep + "esm" + sep + "loader.js", "utf8")

  scriptOptions = {
    __proto__: null,
    cachedData,
    filename,
    produceCachedData: typeof createCachedData !== "function"
  }
}

const script = new Script(
  "const __global__ = this;" +
  "(function (require, module, __jest__, __shared__) { " +
  content +
  "\n});",
  scriptOptions
)

let compiledESM

if (isChakra ||
    isElectronRenderer) {
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

if (cachePath) {
  const { dir } = shared.package

  dir[cachePath] || (dir[cachePath] = {
    buffer: cachedData,
    compile: {
      __proto__: null,
      esm: {
        changed: false,
        scriptData: cachedData,
        sourceType: 1
      }
    },
    map: { __proto__: null }
  })

  shared.pendingScripts[cachePath] = {
    __proto__: null,
    esm: script
  }
}

defineProperty(makeRequireFunction, shared.symbol.package, {
  __proto__: null,
  value: true
})

defineProperty(makeRequireFunction, shared.customInspectKey, {
  __proto__: null,
  value: () => "esm enabled"
})

defineProperty(makeRequireFunction, "process", {
  __proto__: null,
  value: jestTransform
})

freeze(makeRequireFunction)

module.exports = makeRequireFunction
