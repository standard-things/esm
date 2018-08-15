import { Script } from "../safe/vm.js"

import { deprecate } from "../safe/util.js"
import keysAll from "./keys-all.js"
import setProperty from "./set-property.js"
import shared from "../shared.js"

function init() {
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

  const reassignNames = [
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

    for (const name of reassignNames) {
      const descriptor = Reflect.getOwnPropertyDescriptor(context, name)

      // For an unknown reason some global properties aren't accessible as free
      // global variables unless they are deleted and re-added to the context.
      if (descriptor &&
          Reflect.deleteProperty(context, name)) {
        Reflect.defineProperty(context, name, descriptor)
      }
    }

    const builtinNames = []

    for (const name of possibleBuiltinNames) {
      if (Reflect.has(context, name)) {
        builtinNames.push(name)
        Reflect.deleteProperty(context, name)
      }
    }

    const builtins = new Script(
      "({" +
      builtinNames.join(",") +
      "})"
    ).runInContext(context)

    for (const name in builtins) {
      Reflect.defineProperty(context, name, {
        configurable: true,
        enumerable: false,
        value: builtins[name],
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
