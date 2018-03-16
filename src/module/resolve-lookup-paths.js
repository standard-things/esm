// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import _resolveLookupPaths from "./_resolve-lookup-paths.js"
import builtinEntries from "../builtin-entries.js"

const ExArray = __external__.Array

function resolveLookupPaths(request, parent, newReturn) {
  if (request in builtinEntries) {
    return newReturn ? null : new ExArray(request, new ExArray)
  }

  const paths = _resolveLookupPaths(request, parent)
  return newReturn ? paths : new ExArray(request, paths)
}

export default resolveLookupPaths
