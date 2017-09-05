// Based on Node's `Module._findPath` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _findPath from "./_find-path.js"

function findPath(id, paths, isMain) {
  return _findPath(id, paths, isMain) || false
}

export default findPath
