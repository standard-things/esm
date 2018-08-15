// Based on `Module._nodeModulePaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import CHAR_CODE from "../../constant/char-code.js"
import ENV from "../../constant/env.js"

import GenericArray from "../../generic/array.js"
import SafeModule from "../../safe/module.js"

import { resolve } from "../../safe/path.js"

const {
  BACKWARD_SLASH,
  COLON,
  FORWARD_SLASH
} = CHAR_CODE

const {
  ELECTRON,
  WIN32
} = ENV

const nmChars = Array.prototype
  .map.call("node_modules", (char) => char.charCodeAt(0))
  .reverse()

const nmLength = nmChars.length

function nodeModulePaths(from) {
  // Electron and Muon patch `Module_nodeModulePaths()` to remove paths outside the app.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  // https://github.com/brave/muon/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON) {
    return SafeModule._nodeModulePaths(from)
  }

  return WIN32
    ? win32Paths(from)
    : posixPaths(from)
}

function posixPaths(from) {
  from = resolve(from)

  // Return early not only to avoid unnecessary work, but to avoid returning
  // an array of two items for a root path: ["//node_modules", "/node_modules"]
  if (from === "/") {
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

    if (code === FORWARD_SLASH) {
      if (nmCount !== nmLength) {
        GenericArray.push(paths, from.slice(0, last) + "/node_modules")
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

  // Append "/node_modules" to handle root paths.
  GenericArray.push(paths, "/node_modules")

  return paths
}

function win32Paths(from) {
  from = resolve(from)

  // Return root node_modules when path is "D:\\".
  if (from.charCodeAt(from.length - 1) === BACKWARD_SLASH &&
      from.charCodeAt(from.length - 2) === COLON) {
    return GenericArray.of(from + "node_modules")
  }

  let { length } = from
  let last = length
  let nmCount = 0

  const paths = GenericArray.of()

  while (length--) {
    const code = from.charCodeAt(length)

    // The path segment separator check ("\" and "/") was used to get
    // node_modules path for every path segment. Use colon as an extra
    // condition since we can get node_modules path for drive root like
    // "C:\node_modules" and don"t need to parse drive name.
    if (code === BACKWARD_SLASH ||
        code === COLON ||
        code === FORWARD_SLASH) {
      if (nmCount !== nmLength) {
        GenericArray.push(paths, from.slice(0, last) + "\\node_modules")
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

  return paths
}

export default nodeModulePaths
