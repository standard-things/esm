// Based on Node's `path._makeLong` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/path.js

import { resolve } from "path"

const codeOfBackslash = "\\".charCodeAt(0)
const codeOfColon = ":".charCodeAt(0)
const codeOfDot = ".".charCodeAt(0)
const codeOfQMark = "?".charCodeAt(0)

function posixToNamespacedPath(thePath) {
  return thePath
}

function win32ToNamespacedPath(thePath) {
  if (typeof thePath !== "string" ||
      ! thePath.length) {
    return thePath
  }

  const resolvedPath = resolve(thePath)

  if (resolvedPath.length < 3) {
    return thePath
  }

  const code0 = resolvedPath.charCodeAt(0)
  const code1 = resolvedPath.charCodeAt(1)

  if (code0 === codeOfBackslash) {
    // Convert the network path if it's not already a long UNC path or a named pipe.
    // https://msdn.microsoft.com/library/windows/desktop/aa365783(v=vs.85).aspx
    if (resolvedPath.charCodeAt(1) === codeOfBackslash) {
      const code2 = resolvedPath.charCodeAt(2)

      if (code2 !== codeOfQMark && code2 !== codeOfDot) {
        return "\\\\?\\UNC\\" + resolvedPath.slice(2)
      }
    }

    return thePath
  }

  // Detect drive letter, i.e. `[A-Za-z]:\\`
  if (code1 === codeOfColon &&
      ((code0 > 64 && code0 < 91) || (code0 > 96 && code0 < 123)) &&
      resolvedPath.charCodeAt(2) === codeOfBackslash) {
    return "\\\\?\\" + resolvedPath
  }

  return thePath
}

export default process.platform === "win32"
  ? win32ToNamespacedPath
  : posixToNamespacedPath
