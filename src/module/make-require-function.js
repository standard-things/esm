// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import Module from "../module.js"

import errors from "../errors.js"
import loadCJS from "./cjs/load.js"
import moduleState from "./state.js"

function makeRequireFunction(mod, requirer) {
  function req(id) {
    moduleState.requireDepth += 1

    try {
      if (typeof id !== "string") {
        throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
      }

      return requirer.call(mod, id)
    } finally {
      moduleState.requireDepth -= 1
    }
  }

  function resolve(id) {
    return Module._resolveFilename(id, mod)
  }

  if (typeof requirer !== "function") {
    requirer = (id) => loadCJS(id, mod, false)
  }

  req.cache = Module._cache
  req.extensions = Module._extensions
  req.main = process.mainModule
  req.resolve = resolve

  return req
}

export default makeRequireFunction
