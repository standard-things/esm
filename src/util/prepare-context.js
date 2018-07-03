import { deprecate } from "../safe/util.js"
import keysAll from "./keys-all.js"
import shared from "../shared.js"

function init() {
  const globalNames = [
    "Buffer",
    "clearImmediate",
    "clearInterval",
    "clearTimeout",
    "console",
    "global",
    "process",
    "setImmediate",
    "setInterval",
    "setTimeout",
    "URL",
    "URLSearchParams"
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

    for (const name of globalNames) {
      const descriptor = Reflect.getOwnPropertyDescriptor(context, name)

      // For an unknown reason some global properties aren't accessible as free
      // global variables unless they are deleted and re-added to the context.
      if (descriptor &&
          Reflect.deleteProperty(context, name)) {
        Reflect.defineProperty(context, name, descriptor)
      }
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
        Reflect.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })
      }, depMessage, depCode)
    }
  }

  return prepareContext
}

export default shared.inited
  ? shared.module.utilPrepareContext
  : shared.module.utilPrepareContext = init()
