// Based on `Module._initPaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../../generic/array.js"
import Module from "../../module.js"

import esmState from "../esm/state.js"
import initGlobalPaths from "../internal/init-global-paths.js"

function initPaths() {
  const globalPaths = initGlobalPaths()

  esmState.globalPaths = globalPaths
  Module.globalPaths = GenericArray.from(globalPaths)
}

export default initPaths
