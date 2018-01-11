// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _load from "./_load.js"
import builtinEntries from "../../builtin-entries.js"

function load(request, parent, isMain) {
  return request in builtinEntries
    ? builtinEntries[request].module.exports
    : _load(request, parent, isMain).module.exports
}

export default load
