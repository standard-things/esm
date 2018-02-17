import binding from "./binding.js"
import encodeId from "./util/encode-id.js"
import md5 from "./util/md5.js"
import { promisify } from "util"
import satisfies from "./util/satisfies.js"
import setDeferred from "./util/set-deferred.js"

let shared

if (__shared__) {
  shared = __shared__
} else {
  const { getOwnPropertySymbols } = Object
  const getSymbolFor = Symbol.for
  const globalName = encodeId("_" + md5(Date.now().toString()).slice(0, 3))
  const { versions } = process

  const fastPath = { __proto__: null }
  const support = { __proto__: null }

  const symbol = {
    __proto__: null,
    _compile: getSymbolFor("@std/esm:module._compile"),
    mjs: getSymbolFor('@std/esm:Module._extensions[".mjs"]'),
    wrapper: getSymbolFor("@std/esm:wrapper")
  }

  shared = {
    __proto__: null,
    binding,
    builtin: { __proto__: null },
    decodeURI,
    decodeURIComponent,
    encodeURI,
    entry: {
      __proto__: null,
      cache: new WeakMap,
      skipExports: { __proto__: null }
    },
    env: {
      __proto__: null,
      win32: process.platform === "win32"
    },
    fastPath,
    findPath: { __proto__: null },
    generic: { __proto__: null },
    global,
    globalName,
    inited: false,
    maxSatisfying: { __proto__: null },
    package: {
      __proto__: null,
      cache: { __proto__: null },
      default: null,
      dir: { __proto__: null },
      root: { __proto__: null }
    },
    parseURL: { __proto__: null },
    pendingMetas: { __proto__: null },
    pendingWrites: { __proto__: null },
    process: {
      __proto__: null,
      dlopen: process.dlopen,
      version: process.version,
      versions: {
        __proto__: null,
        chakracore: versions.chakracore,
        v8: versions.v8
      }
    },
    readPackage: { __proto__: null },
    resolveFilename: { __proto__: null },
    satisfies: { __proto__: null },
    support,
    symbol
  }

  setDeferred(shared, "arrowSymbol", () => {
    if (satisfies(shared.process.version, "<6.0.0")) {
      return "arrowMessage"
    }

    return satisfies(shared.process.version, "<7.0.0")
      ? "node:arrowMessage"
      : binding.util.arrow_message_private_symbol
  })

  setDeferred(shared, "decoratedSymbol", () => {
    if (satisfies(shared.process.version, "<6.0.0")) {
      return
    }

    return satisfies(shared.process.version, "<7.0.0")
      ? "node:decorated"
      : binding.util.decorated_private_symbol
  })

  setDeferred(shared, "hiddenKeyType", () => {
    return satisfies(shared.process.version, "<7.0.0")
      ? "string"
      : typeof shared.arrowSymbol
  })

  setDeferred(shared, "statValues", () => {
    return shared.support.getStatValues
      ? binding.fs.getStatValues()
      : new Float64Array(14)
  })

  setDeferred(fastPath, "mtime", () => {
    return typeof binding.fs.stat === "function" &&
      satisfies(shared.process.version, "^6.10.1||>=7.7")
  })

  setDeferred(fastPath, "readFile", () => {
    return support.internalModuleReadFile
  })

  setDeferred(fastPath, "readFileFast", () => {
    return support.internalModuleReadJSON || support.internalModuleReadFile
  })

  setDeferred(fastPath, "stat", () => {
    return typeof binding.fs.internalModuleStat === "function"
  })

  setDeferred(support, "await", () => {
    return satisfies(shared.process.version, ">=7.6.0")
  })

  setDeferred(support, "blockScopedDeclarations", () => {
    try {
      (0, eval)("let a")
      return true
    } catch (e) {}

    return false
  })

  setDeferred(support, "getStatValues", () => {
    return typeof binding.fs.getStatValues === "function"
  })

  setDeferred(support, "internalModuleReadFile", () => {
    return typeof binding.fs.internalModuleReadFile === "function"
  })

  setDeferred(support, "internalModuleReadJSON", () => {
    return typeof binding.fs.internalModuleReadJSON === "function"
  })

  setDeferred(support, "safeGetEnv", () => {
    return typeof binding.util.safeGetenv === "function"
  })

  setDeferred(support, "setHiddenValue", () => {
    return typeof binding.util.setHiddenValue === "function"
  })

  setDeferred(symbol, "errorCode", () => {
    let error

    try {
      promisify()
    } catch (e) {
      error = e
    }

    const symbols = error
      ? getOwnPropertySymbols(error)
      : []

    return symbols.length
      ? symbols[0]
      : getSymbolFor("@std/esm:errorCode")
  })
}

export default shared
