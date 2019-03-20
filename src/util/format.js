// Based on `util.format()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/util/inspect.js

import emptyObject from "./empty-object.js"
import formatWithOptions from "./format-with-options.js"

function format(...args) {
  return formatWithOptions(emptyObject, ...args)
}

export default format
