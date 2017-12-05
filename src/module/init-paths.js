// Based on Node"s `Module._initPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import _initPaths from "./_init-paths.js"
import moduleState from "./state.js"

function initPaths() {
  moduleState.globalPaths = _initPaths()
  Module.globalPaths = moduleState.globalPaths.slice()
}

export default initPaths
