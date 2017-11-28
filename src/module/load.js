// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _load from "./_load.js"
import builtinModules from "../builtin-modules.js"

function load(id, parent, isMain) {
  return id in builtinModules
    ? builtinModules[id].exports
    : _load(id, parent, isMain, __non_webpack_require__).exports
}

export default load
