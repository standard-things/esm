// Based on Node's `internalModule.stripBOM` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

function stripBOM(string) {
  if (typeof string !== "string") {
    return ""
  }

  return string.charCodeAt(0) === 65279 /* \ufeff */
    ? string.slice(1)
    : string
}

export default stripBOM
