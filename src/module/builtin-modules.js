import GenericArray from "../generic/array.js"

import binding from "../binding.js"
import realProcess from "../real/process.js"
import shared from "../shared.js"

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (! Array.isArray(builtinModules) ||
      ! Object.isFrozen(builtinModules)) {
    builtinModules = []

    let { exposeInternals } = binding.config

    if (exposeInternals === void 0) {
      const flagRegExp = /^--expose[-_]internals$/

      exposeInternals = GenericArray
        .some(realProcess.execArgv, (arg) => flagRegExp.test(arg))
    }

    if (exposeInternals) {
      for (const name in binding.natives) {
        if (name !== "internal/bootstrap_loaders" &&
            name !== "internal/bootstrap/loaders") {
          builtinModules.push(name)
        }
      }
    } else {
      for (const name in binding.natives) {
        if (! name.startsWith("internal/")) {
          builtinModules.push(name)
        }
      }
    }
  } else {
    builtinModules = GenericArray.slice(builtinModules)
  }

  return Object.freeze(GenericArray.sort(builtinModules))
}

export default shared.inited
  ? shared.module.builtinModules
  : shared.module.builtinModules = init()
