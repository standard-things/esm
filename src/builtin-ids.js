import binding from "./binding.js"
import { execArgv } from "./safe/process.js"
import shared from "./shared.js"

function init() {
  let ids = __non_webpack_module__.constructor.builtinModules

  if (Array.isArray(ids) &&
      Object.isFrozen(ids)) {
    ids = Array.from(ids)
  } else {
    let { exposeInternals } = binding.config

    if (exposeInternals === void 0) {
      const flagRegExp = /^--expose[-_]internals$/

      exposeInternals = execArgv.some((arg) => flagRegExp.test(arg))
    }

    ids = []

    for (const name in binding.natives) {
      if (exposeInternals) {
        if (name !== "internal/bootstrap_loaders" &&
            name !== "internal/bootstrap/loaders") {
          ids.push(name)
        }
      } else if (! name.startsWith("internal/")) {
        ids.push(name)
      }
    }
  }

  return ids.sort()
}

export default shared.inited
  ? shared.module.builtinIds
  : shared.module.builtinIds = init()
