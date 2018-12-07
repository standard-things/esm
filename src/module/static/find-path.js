// Based on `Module._findPath()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import RealModule from "../../real/module.js"

import _findPath from "../internal/find-path.js"
import maskFunction from "../../util/mask-function.js"

const findPath = maskFunction(function (request, paths, isMain) {
  const result = _findPath(request, paths, isMain)

  return result === "" ? false : result
}, RealModule._findPath)

export default findPath
