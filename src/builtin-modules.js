
import Module from "./module.js"

import builtinIds from "./builtin-ids.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"

const builtinModules = { __proto__: null }
const cache = shared.memoize.builtinModules

for (const id of builtinIds) {
  if (Reflect.has(cache, id)) {
    builtinModules[id] = cache[id]
  } else {
    setDeferred(builtinModules, id, () => {
      const mod = new Module(id, null)

      if (id !== "module") {
        cache[id] = mod
      }

      return mod
    })
  }
}

export default builtinModules
