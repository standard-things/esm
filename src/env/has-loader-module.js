import GenericArray from "../generic/array.js"

import isOwnPath from "../util/is-own-path.js"
import shared from "../shared.js"

function init() {
  function hasLoaderModule(modules) {
    return Array.isArray(modules) &&
      GenericArray.some(modules, (mod) => isOwnPath(mod.filename))
  }

  return hasLoaderModule
}

export default shared.inited
  ? shared.module.envHasLoaderModule
  : shared.module.envHasLoaderModule = init()
