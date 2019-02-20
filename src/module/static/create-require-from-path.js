// Based on `Module.createRequireFromPath()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Module from "../../module.js"
import RealModule from "../../real/module.js"

import { dirname } from "../../safe/path.js"
import makeRequireFunction from "../internal/make-require-function.js"
import maskFunction from "../../util/mask-function.js"
import validateString from "../../util/validate-string.js"

const createRequireFromPath = maskFunction(function (filename) {
  validateString(filename, "filename")

  const parent = new Module(filename)

  parent.filename = filename
  parent.paths = Module._nodeModulePaths(dirname(filename))
  return makeRequireFunction(parent)
}, RealModule.createRequireFromPath)

export default createRequireFromPath
