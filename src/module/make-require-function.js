// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import errors from "../errors.js"
import moduleState from "./state.js"

function makeRequireFunction(mod, requirer = mod.require) {
  const { _resolveFilename } = mod.constructor

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
    return _resolveFilename(id, mod)
  }

  req.cache = __non_webpack_require__.cache
  req.extensions = __non_webpack_require__.extensions
  req.main = process.mainModule
  req.resolve = resolve

  return req
}

export default makeRequireFunction
