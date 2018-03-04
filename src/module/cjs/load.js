// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Entry from "../../entry.js"

import _load from "./_load.js"
import builtinEntries from "../../builtin-entries.js"
import errors from "../../errors.js"

const {
  ERR_REQUIRE_ESM
} = errors

function load(request, parent, isMain) {
  if (request in builtinEntries) {
    return builtinEntries[request].module.exports
  }

  const childEntry = _load(request, parent, isMain)
  const child = childEntry.module
  const childCached = childEntry.package.cache.compile[childEntry.cacheName]
  const childIsESM = childCached && childCached.sourceType === "module"

  if (childIsESM &&
      parent) {
    const { options } = Entry.get(parent).package

    if (options.mode === "mjs" &&
        ! options.cjs.vars) {
      throw new ERR_REQUIRE_ESM(child)
    }
  }

  return child.exports
}

export default load
