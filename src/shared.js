
import NullObject from "./null-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import binding from "./binding.js"
import encodeId from "./util/encode-id.js"
import getSymbols from "./util/get-symbols.js"
import md5 from "./util/md5.js"
import { promisify } from "util"
import satisfies from "./util/satisfies.js"
import setDeferred from "./util/set-deferred.js"

const getSymbolFor = Symbol.for
const { now } = Date

const nodeVersion = process.version

let shared

if (__shared__) {
  shared = __shared__
} else {
  const fastPath = new NullObject
  const globalName = encodeId("_" + md5(now().toString()).slice(0, 3))
  const support = new NullObject
  const symbol = {
    __proto__: null,
    _compile: getSymbolFor("@std/esm:module._compile"),
    mjs: getSymbolFor('@std/esm:Module._extensions[".mjs"]'),
    wrapper: getSymbolFor("@std/esm:wrapper")
  }

  shared = {
    __proto__: null,
    binding,
    entry: {
      __proto__: null,
      cache: new SafeWeakMap,
      skipExports: new NullObject
    },
    env: new NullObject,
    fastPath,
    findPath: new NullObject,
    global,
    globalName,
    inited: false,
    maxSatisfying: new NullObject,
    package: {
      __proto__: null,
      cache: {
        __proto__: null
      },
      default: null,
      dir: {
        __proto__: null
      },
      root: {
        __proto__: null
      }
    },
    parseURL: new NullObject,
    pendingMetas: new NullObject,
    pendingWrites: new NullObject,
    readPackage: new NullObject,
    resolveFilename: new NullObject,
    satisfies: new NullObject,
    support,
    symbol
  }

  fastPath.gunzip = true
  fastPath.gzip = true

  setDeferred(fastPath, "mtime", () => {
    return typeof binding.fs.stat === "function" &&
      satisfies(nodeVersion, "^6.10.1||>=7.7")
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

  setDeferred(shared, "arrowSymbol", () => {
    if (satisfies(nodeVersion, "<6.0.0")) {
      return "arrowMessage"
    }

    return satisfies(nodeVersion, "<7.0.0")
      ? "node:arrowMessage"
      : binding.util.arrow_message_private_symbol
  })

  setDeferred(shared, "decoratedSymbol", () => {
    if (satisfies(nodeVersion, "<6.0.0")) {
      return
    }

    return satisfies(nodeVersion, "<7.0.0")
      ? "node:decorated"
      : binding.util.decorated_private_symbol
  })

  setDeferred(shared, "hiddenKeyType", () => {
    return satisfies(nodeVersion, "<7.0.0")
      ? "string"
      : typeof shared.arrowSymbol
  })

  setDeferred(shared, "statValues", () => {
    return shared.support.getStatValues
      ? binding.fs.getStatValues()
      : new Float64Array(14)
  })

  setDeferred(support, "await", () => {
    return satisfies(nodeVersion, ">=7.6.0")
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

    const symbols = getSymbols(error)
    return symbols.length ? symbols[0] : getSymbolFor("@std/esm:errorCode")
  })
}

export default shared
