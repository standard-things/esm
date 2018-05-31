// Based on Node's `Module._initPaths`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../generic/array.js"
import Module from "../module.js"

import initGlobalPaths from "./init-global-paths.js"
import moduleState from "./state.js"

function initPaths() {
  const globalPaths = initGlobalPaths()
  moduleState.globalPaths = globalPaths
  Module.globalPaths = GenericArray.from(globalPaths)
}

export default initPaths
