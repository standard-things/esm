// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _load from "./_load.js"
import builtinModules from "../../builtin-modules.js"

function load(request, parent, isMain) {
  return request in builtinModules
    ? builtinModules[request].exports
    : _load(request, parent, isMain).exports
}

export default load
