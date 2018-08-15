import ENV from "../constant/env.js"

import { Script } from "../safe/vm.js"

import { deprecate } from "../safe/util.js"
import keysAll from "./keys-all.js"
import setProperty from "./set-property.js"
import shared from "../shared.js"

function init() {
  const {
    CHAKRA
  } = ENV

  const possibleBuiltinNames = [
    "Array", "ArrayBuffer", "Atomics", "BigInt", "BigInt64Array",
    "BigUint64Array", "Boolean", "DataView", "Date", "Error", "EvalError",
    "Float32Array", "Float64Array", "Function", "Infinity", "Int16Array",
    "Int32Array", "Int8Array", "Intl", "JSON", "Map", "Math", "NaN", "Number",
    "Object", "Promise", "Proxy", "RangeError", "ReferenceError", "Reflect",
    "RegExp", "Set", "SharedArrayBuffer", "String", "Symbol", "SyntaxError",
    "TypeError", "URIError", "Uint16Array", "Uint32Array", "Uint8Array",
    "Uint8ClampedArray", "WeakMap", "WeakSet", "WebAssembly"
  ]

  const reassignGlobalNames = [
    "Buffer",
    "URL",
    "URLSearchParams",
    "clearImmediate",
    "clearInterval",
    "clearTimeout",
    "console",
    "global",
    "process",
    "setImmediate",
    "setInterval",
    "setTimeout"
  ]

  function prepareContext(context) {
    const { defaultGlobal } = shared

    if (context === defaultGlobal) {
      return context
    }

    const names = keysAll(defaultGlobal)

    for (const name of names) {
      let descriptor

      if (name === "global") {
        descriptor = {
          configurable: true,
          enumerable: true,
          value: context,
          writable: true
        }
      } else if (name === "GLOBAL" ||
          name === "root") {
        descriptor = getDeprecatedGlobalDescriptor(name, context)
      } else if (! Reflect.has(context, name)) {
        descriptor = Reflect.getOwnPropertyDescriptor(defaultGlobal, name)
      }

      if (descriptor) {
        Reflect.defineProperty(context, name, descriptor)
      }
    }

    // For an unknown reason some `context` properties aren't accessible as
    // free global variables unless they are deleted and reassigned.
    for (const name of reassignGlobalNames) {
      const descriptor = Reflect.getOwnPropertyDescriptor(context, name)

      if (descriptor &&
          Reflect.deleteProperty(context, name)) {
        Reflect.defineProperty(context, name, descriptor)
      }
    }

    if (CHAKRA) {
      return context
    }

    // Replace builtin `context` properties with those from the realm it backs to
    // preserve the realm specific wirings of methods like `Error.prepareStackTrace()`.
    // https://github.com/nodejs/node/issues/21574
    const builtinNames = []
    const oldBuiltinValues = { __proto__: null }

    for (const name of possibleBuiltinNames) {
      if (Reflect.has(context, name)) {
        builtinNames.push(name)
        oldBuiltinValues[name] = context[name]
        Reflect.deleteProperty(context, name)
      }
    }

    const builtinValues = new Script(
      "({__proto__:null," +
      builtinNames
        .map((name) => name + ":this." + name)
        .join(",") +
      "})"
    ).runInContext(context)

    for (const name of builtinNames) {
      Reflect.defineProperty(context, name, {
        configurable: true,
        enumerable: false,
        value: builtinValues[name] || oldBuiltinValues[name],
        writable: true
      })
    }

    return context
  }

  function getDeprecatedGlobalDescriptor(name, context) {
    const depCode = "DEP0016"
    const depMessage =  "'" + name + "' is deprecated, use 'global'"

    return {
      configurable: true,
      get: deprecate(() => context, depMessage, depCode),
      set: deprecate(function (value) {
        setProperty(this, name, value)
      }, depMessage, depCode)
    }
  }

  return prepareContext
}

export default shared.inited
  ? shared.module.utilPrepareContext
  : shared.module.utilPrepareContext = init()
