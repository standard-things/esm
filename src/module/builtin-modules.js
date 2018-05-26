import GenericArray from "../generic/array.js"

import binding from "../binding.js"
import { execArgv } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  let { builtinModules } = __non_webpack_module__.constructor

  if (Array.isArray(builtinModules) &&
      Object.isFrozen(builtinModules)) {
    return Object.freeze(GenericArray.sort(GenericArray.slice(builtinModules)))
  }

  let { exposeInternals } = binding.config

  if (exposeInternals === void 0) {
    const flagRegExp = /^--expose[-_]internals$/

    exposeInternals = GenericArray
      .some(execArgv, (arg) => flagRegExp.test(arg))
  }

  builtinModules = []

  for (const name in binding.natives) {
    if (exposeInternals) {
      if (name !== "internal/bootstrap_loaders" &&
          name !== "internal/bootstrap/loaders") {
        builtinModules.push(name)
      }
    } else if (! name.startsWith("internal/")) {
      builtinModules.push(name)
    }
  }

  return Object.freeze(GenericArray.sort(builtinModules))
}

export default shared.inited
  ? shared.module.builtinModules
  : shared.module.builtinModules = init()
