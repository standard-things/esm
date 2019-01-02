import binding from "./binding.js"
import getFlags from "./env/get-flags.js"
import shared from "./shared.js"

function init() {
  let ids = __non_webpack_module__.constructor.builtinModules

  if (Array.isArray(ids) &&
      Object.isFrozen(ids)) {
    ids = Array.from(ids)
  } else {
    const { exposeInternals } = getFlags()

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
