// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _resolveFilename from "./_resolve-filename.js"
import builtinEntries from "../../builtin-entries.js"

function resolveFilename(request, parent, isMain, options) {
  return request in builtinEntries
    ? request
    : _resolveFilename(request, parent, isMain, options)
}

export default resolveFilename
