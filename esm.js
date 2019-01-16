/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */

const JEST_EVAL_RESULT_VARIABLE = "Object.<anonymous>"

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

  if (typeof result === "string") {
    return result
  }

  return ""
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

function tryRequire(request) {
  try {
    return require(request)
  } catch (e) {}
}

const jestEnvironmentHooks = { __proto__: null }

function jestTransform(content, filename, { cwd, testEnvironment }) {
  if (! has(jestEnvironmentHooks, cwd)) {
    jestEnvironmentHooks[cwd] = {
      compile: { __proto__: null },
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

  const {
    CachingCompiler,
    moduleInternalCompileSource
  } = shared.module

  const Entry = loader(symbol.entry)
  const Runtime = loader(symbol.runtime)

  const compileData = CachingCompiler.compile(content, {
    cjsVars: true,
    filename,
    runtimeName,
    sourceType: 3
  })

  jestEnvironmentHooks[cwd].compile[filename] = compileData

  const isESM = compileData.sourceType === 2

  const code = moduleInternalCompileSource(compileData, {
    cjsVars: true,
    runtimeName
  })

  if (! has(jestEnvironmentHooks[cwd], testEnvironment)) {
    jestEnvironmentHooks[testEnvironment] = true

    Environment.prototype.runScript = function (...args) {
      const scriptResult = Reflect.apply(runScript, this, args)
      const wrapper = scriptResult[JEST_EVAL_RESULT_VARIABLE]

      scriptResult[JEST_EVAL_RESULT_VARIABLE] = function (...args) {
        const [mod] = args
        const entry = Entry.get(mod)

        entry.compileData = jestEnvironmentHooks[cwd].compile[entry.filename]
        entry.runtimeName = runtimeName
        entry.type = isESM ? 2 : 1

        const runtime = Runtime.enable(entry, {})

        let moduleResult = Reflect.apply(wrapper, this, args)

        if (isESM) {
          // Debuggers may wrap `Module#_compile()` with
          // `process.binding("inspector").callAndPauseOnStart()`
          // and not forward the return value.
          const { _runResult } = runtime

          // Eventually, we will call this in the instantiate phase.
          _runResult.next()

          moduleResult = _runResult.next().value
        }

        return moduleResult
      }

      return scriptResult
    }
  }

  return { code }
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
