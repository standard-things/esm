// Based on Node's `Module.prototype.require` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../entry.js"
import Module from "../module.js"

import assert from "assert"
import builtinEntries from "../builtin-entries.js"
import errors from "../errors.js"
import getFilePathFromURL from "../util/get-file-path-from-url.js"
import isError from "../util/is-error.js"
import loadESM from "./esm/_load.js"

function require(request) {
  assert(request, "missing path")
  assert(typeof request === "string", "path must be a string")

  if (request in builtinEntries) {
    return builtinEntries[request].module.exports
  }

  const entry = Entry.get(this)

  if (! entry.options.cjs.vars) {
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
