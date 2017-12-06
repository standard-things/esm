// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _resolveFilename from "./_resolve-filename.js"
import builtinModules from "../../builtin-modules.js"

function resolveFilename(id, parent, isMain) {
  return id in builtinModules
    ? id
    : _resolveFilename(id, parent, isMain)
}

export default resolveFilename
