// Based on Node's `Module.prototype.load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { dirname, extname } from "path"

import Module from "../module.js"

function load(filePath) {
  if (this.loaded) {
    throw new Error("Module already loaded: " + this.id)
  }

  let ext = extname(filePath)

  if (ext === "" ||
      typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  this.filename = filePath
  this.paths = Module._nodeModulePaths(dirname(filePath))

  Module._extensions[ext](this, filePath)
  this.loaded = true
}

export default load
