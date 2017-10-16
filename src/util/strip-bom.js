// Based on Node's `internalModule.stripBOM` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import toString from "./to-string.js"

const codeOfBOM = "\ufeff".charCodeAt(0)

function stripBOM(string) {
  string = toString(string)

  if (string.charCodeAt(0) === codeOfBOM) {
    return string.slice(1)
  }

  return string
}

export default stripBOM
