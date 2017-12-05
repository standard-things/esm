// Based on Node"s `Module._initPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import moduleState from "./state.js"

function initPaths() {
  Module.globalPaths = moduleState.globalPaths.slice()
}

export default initPaths
