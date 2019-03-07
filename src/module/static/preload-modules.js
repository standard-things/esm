// Based on `Module._preloadModules()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Loader from "../../loader.js"
import Module from "../../module.js"
import RealModule from "../../real/module.js"

import { cwd } from "../../safe/process.js"
import isError from "../../util/is-error.js"
import isStackTraceMaskable from "../../util/is-stack-trace-maskable.js"
import maskFunction from "../../util/mask-function.js"
import maskStackTrace from "../../error/mask-stack-trace.js"
import toExternalError from "../../util/to-external-error.js"

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
      maybeMaskStackTrace(e)

      throw e
    }
  }

  try {
    for (const request of requests) {
      parent.require(request)
    }
  } catch (e) {
    maybeMaskStackTrace(e)

    throw e
  }
}, RealModule._preloadModules)

function maybeMaskStackTrace(error) {
  if (! Loader.state.package.default.options.debug &&
      isStackTraceMaskable(error)) {
    maskStackTrace(error)
  } else {
    toExternalError(error)
  }
}

export default preloadModules
