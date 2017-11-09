// Based on Node's `internalModule.stripBOM` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

const codeOfBOM = "\ufeff".charCodeAt(0)

function stripBOM(string) {
  return string.charCodeAt(0) === codeOfBOM
    ? string.slice(1)
    : string
}

export default stripBOM
