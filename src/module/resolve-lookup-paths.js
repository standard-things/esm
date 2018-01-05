// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _resolveLookupPaths from "./_resolve-lookup-paths.js"
import builtinModules from "../builtin-modules.js"

function resolveLookupPaths(request, parent, newReturn) {
  if (request in builtinModules) {
    return newReturn ? null : [request, []]
  }

  const paths = _resolveLookupPaths(request, parent)
  return newReturn ? paths : [request, paths]
}

export default resolveLookupPaths
