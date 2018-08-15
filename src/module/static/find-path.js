// Based on `Module._findPath()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import _findPath from "../internal/find-path.js"

function findPath(request, paths, isMain) {
  return _findPath(request, paths, isMain) || false
}

export default findPath
