// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../../entry.js"

import _load from "./_load.js"
import builtinEntries from "../../builtin-entries.js"
import errors from "../../errors.js"

function load(request, parent, isMain) {
  if (request in builtinEntries) {
    return builtinEntries[request].module.exports
  }

  const childEntry = _load(request, parent, isMain)
  const child = childEntry.module
  const childCached = childEntry.package.cache[childEntry.cacheFileName]
  const childIsESM = childCached && childCached.esm

  if (childIsESM &&
      parent &&
      ! Entry.get(parent).package.options.cjs.vars) {
    throw new errors.Error("ERR_REQUIRE_ESM", child)
  }

  return child.exports
}

export default load
