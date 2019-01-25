// Based on `Module._preloadModules()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Module from "../../module.js"
import RealModule from "../../real/module.js"

import { cwd } from "../../safe/process.js"
import isError from "../../util/is-error.js"
import maskFunction from "../../util/mask-function.js"

const preloadModules = maskFunction(function (requests) {
  if (! Array.isArray(requests) ||
      requests.length === 0) {
    return
  }

  const parent = new Module("internal/preload", null)

  try {
    parent.paths = Module._nodeModulePaths(cwd())
  } catch (e) {
    if (! isError(e) ||
        e.code !== "ENOENT") {
      throw e
    }
  }

  for (const request of requests) {
    parent.require(request)
  }
}, RealModule._preloadModules)

export default preloadModules
