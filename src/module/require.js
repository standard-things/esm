// Based on Node's `Module.prototype.require` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../entry.js"
import Module from "../module.js"

import builtinEntries from "../builtin-entries.js"
import errors from "../errors.js"
import getFilePathFromURL from "../util/get-file-path-from-url.js"
import isError from "../util/is-error.js"
import loadESM from "./esm/_load.js"

function require(request) {
  if (typeof request !== "string") {
    throw new errors.Error("ERR_INVALID_ARG_TYPE", "request", "string", request)
  }

  if (request === "") {
    throw new errors.Error("ERR_INVALID_ARG_VALUE", "request",  request, "must be a non-empty string")
  }

  if (request in builtinEntries) {
    return builtinEntries[request].module.exports
  }

  const entry = Entry.get(this)

  if (! entry.package.options.cjs.vars) {
    return Module._load(request, this, false)
  }

  let childEntry

  try {
    childEntry = loadESM(request, this, false)
  } catch (e) {
    if (isError(e)) {
      const { code } = e

      if (code === "ERR_MODULE_RESOLUTION_LEGACY") {
        return Module._load(request, this, false)
      }

      if (code === "ERR_MISSING_MODULE") {
        const { message } = e
        const url = message.slice(message.lastIndexOf(" ") + 1)
        throw new errors.Error("MODULE_NOT_FOUND", getFilePathFromURL(url))
      }
    }

    throw e
  }

  return childEntry.module.exports
}

export default require
