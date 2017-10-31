// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _resolveLookupPaths from "./_resolve-lookup-paths.js"
import builtinModules from "../builtin-modules.js"

function resolveLookupPaths(id, parent, newReturn) {
  if (id in builtinModules) {
    return newReturn ? null : [id, []]
  }

  const paths = _resolveLookupPaths(id, parent)
  return newReturn ? paths : [id, paths]
}

export default resolveLookupPaths
