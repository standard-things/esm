// Based on Node's `Module.prototype.require` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../entry.js"
import Module from "../module.js"

import builtinEntries from "../builtin-entries.js"
import errors from "../errors.js"
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
  const cached = entry.package.cache[entry.cacheName]
  const isESM = cached && cached.esm

  return isESM
    ? loadESM(request, this, false).module.exports
    : Module._load(request, this, false)
}

export default require
