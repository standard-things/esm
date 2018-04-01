import GenericArray from "../generic/array.js"

import isOwnpath from "../util/is-own-path.js"

function hasLoaderModule(modules) {
  return Array.isArray(modules) &&
    GenericArray.some(modules, (mod) => isOwnpath(mod.filename))
}

export default hasLoaderModule
