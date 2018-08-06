import Module from "./module.js"

import builtinConsole from "./builtin/console.js"
import builtinIds from "./builtin-ids.js"
import builtinUtil from "./builtin/util.js"
import builtinVM from "./builtin/vm.js"
import realRequire from "./real/require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import unwrapProxy from "./util/unwrap-proxy.js"

const builtinModules = { __proto__: null }
const cache = shared.memoize.builtinModules

function getExports(id) {
  if (id === "console") {
    return builtinConsole
  }

  if (id === "module") {
    return Module
  }

  if (id === "util") {
    return builtinUtil
  }

  if (id === "vm") {
    return builtinVM
  }

  return unwrapProxy(realRequire(id))
}

for (const id of builtinIds) {
  setDeferred(builtinModules, id, () => {
    const cached = cache[id]

    if (cached) {
      return cached
    }

    const mod = new Module(id)

    mod.exports = getExports(id)
    mod.loaded = true

    if (id !== "module") {
      cache[id] = mod
    }

    return mod
  })
}

export default builtinModules
