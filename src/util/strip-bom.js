// Based on Node's `internalModule.stripBOM` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import GenericString from "../generic/string.js"

function stripBOM(string) {
  if (typeof string !== "string") {
    return ""
  }

  return GenericString.charCodeAt(string, 0) === 65279 /* \ufeff */
    ? GenericString.slice(string, 1)
    : string
}

export default stripBOM
