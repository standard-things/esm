// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import Module from "../module.js"

import errors from "../errors.js"
import moduleState from "./state.js"
import resolveFilename from "./resolve-filename.js"

function makeRequireFunction(mod, requirer = mod.require) {
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
    return resolveFilename(id, mod)
  }

  req.cache = Module._cache
  req.extensions = Module._extensions
  req.main = process.mainModule
  req.resolve = resolve

  return req
}

export default makeRequireFunction
