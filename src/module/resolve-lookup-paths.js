// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _resolveLookupPaths from "./_resolve-lookup-paths.js"
import builtinModules from "../builtin-modules.js"

function resolveLookupPaths(id, parent) {
  return id in builtinModules
    ? null
    : _resolveLookupPaths(id, parent)
}

export default resolveLookupPaths
