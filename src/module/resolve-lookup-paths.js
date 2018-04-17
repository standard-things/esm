// Based on Node's `Module._resolveLookupPaths`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../generic/array.js"

import _resolveLookupPaths from "./_resolve-lookup-paths.js"
import builtinEntries from "../builtin-entries.js"

function resolveLookupPaths(request, parent, newReturn) {
  if (Reflect.has(builtinEntries, request)) {
    return newReturn ? null : GenericArray.of(request, GenericArray.of())
  }

  const paths = _resolveLookupPaths(request, parent)
  return newReturn ? paths : GenericArray.of(request, paths)
}

export default resolveLookupPaths
