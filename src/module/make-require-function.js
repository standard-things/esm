// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import errors from "../errors.js"
import moduleState from "./state.js"
import resolveFilename from "./cjs/resolve-filename.js"

function makeRequireFunction(mod, loader = mod.require) {
  function require(id) {
    moduleState.requireDepth += 1

    try {
      if (typeof id !== "string") {
        throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
      }

      return loader.call(mod, id)
    } finally {
      moduleState.requireDepth -= 1
    }
  }

  function resolve(id) {
    return resolveFilename(id, mod)
  }

  require.cache = moduleState._cache
  require.extensions = moduleState._extensions
  require.main = process.mainModule
  require.resolve = resolve

  return require
}

export default makeRequireFunction
