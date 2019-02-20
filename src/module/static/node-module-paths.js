// Based on `Module._nodeModulePaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import { resolve, sep } from "../../safe/path.js"

import CHAR_CODE from "../../constant/char-code.js"
import ENV from "../../constant/env.js"

import GenericArray from "../../generic/array.js"
import RealModule from "../../real/module.js"
import SafeModule from "../../safe/module.js"

import isSep from "../../path/is-sep.js"
import maskFunction from "../../util/mask-function.js"
import validateString from "../../util/validate-string.js"

const {
  BACKWARD_SLASH,
  COLON
} = CHAR_CODE

const {
  ELECTRON,
  WIN32
} = ENV

const nmChars = Array.prototype
  .map.call("node_modules", (char) => char.charCodeAt(0))
  .reverse()

const nmLength = nmChars.length

const nodeModulePaths = maskFunction(function (from) {
  validateString(from, "from")

  // Electron and Muon patch `Module_nodeModulePaths()` to remove paths outside the app.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  // https://github.com/brave/muon/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON) {
    return SafeModule._nodeModulePaths(from)
  }

  from = resolve(from)

  // Return early not only to avoid unnecessary work, but to avoid returning
  // an array of two items for a root path.
  if (WIN32) {
    // Return root node_modules when path is "D:\\".
    if (from.length > 1 &&
        from.charCodeAt(from.length - 1) === BACKWARD_SLASH &&
        from.charCodeAt(from.length - 2) === COLON) {
      return GenericArray.of(from + "node_modules")
    }
  } else if (from === "/") {
    return GenericArray.of("/node_modules")
  }

  // This approach only works when the path is guaranteed to be absolute.
  // Doing a fully-edge-case-correct `path.split()` that works on both Windows
  // and Posix is non-trivial.
  let { length } = from
  let last = length
  let nmCount = 0

  const paths = GenericArray.of()

  while (length--) {
    const code = from.charCodeAt(length)

    // The path segment separator check ("\" and "/") was used to get
    // node_modules path for every path segment.
    if (isSep(code)) {
      if (nmCount !== nmLength) {
        GenericArray.push(paths, from.slice(0, last) + sep + "node_modules")
      }

      last = length
      nmCount = 0
    } else if (nmCount !== -1) {
      if (nmChars[nmCount] === code) {
        nmCount += 1
      } else {
        nmCount = -1
      }
    }
  }

  if (! WIN32) {
    // Append "/node_modules" to handle root paths.
    GenericArray.push(paths, "/node_modules")
  }

  return paths
}, RealModule._nodeModulePaths)

export default nodeModulePaths
