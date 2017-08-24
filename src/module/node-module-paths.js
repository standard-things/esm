// Based on Node's `Module._nodeModulePaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { resolve } from "path"

const codeOfBackslash = "\\".charCodeAt(0)
const codeOfColon = ":".charCodeAt(0)
const codeOfDot = ".".charCodeAt(0)
const codeOfQMark = "?".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const { map } = Array.prototype
const nmChars = map.call("node_modules", (char) => char.charCodeAt(0)).reverse()
const nmLen = nmChars.length

// "from" is the __dirname of the module.
function win32NodeModulePaths(from) {
  from = resolve(from)

  // Return root node_modules when path is "D:\\".
  if (from.charCodeAt(from.length - 1) === codeOfBackslash &&
      from.charCodeAt(from.length - 2) === codeOfColon) {
    return [from + "node_modules"]
  }

  let p = 0
  let length = from.length
  let last = length

  const paths = []

  while (length--) {
    const code = from.charCodeAt(length)

    // The path segment separator check ("\" and "/") was used to get
    // node_modules path for every path segment.
    // Use colon as an extra condition since we can get node_modules
    // path for drive root like "C:\node_modules" and don"t need to
    // parse drive name.
    if (code === codeOfBackslash ||
        code === codeOfSlash ||
        code === codeOfColon) {
      if (p !== nmLen)
        paths.push(from.slice(0, last) + "\\node_modules")
      last = length
      p = 0
    } else if (p !== -1) {
      if (nmChars[p] === code) {
        ++p
      } else {
        p = -1
      }
    }
  }

  return paths
}

function posixNodeModulePaths(from) {
  from = resolve(from)

  // Return early not only to avoid unnecessary work, but to *avoid* returning
  // an array of two items for a root: [ "//node_modules", "/node_modules" ]
  if (from === "/") {
    return ["/node_modules"]
  }

  // note: this approach *only* works when the path is guaranteed
  // to be absolute.  Doing a fully-edge-case-correct path.split
  // that works on both Windows and Posix is non-trivial.
  let p = 0
  let length = from.length
  let last = length

  const paths = []

  while (length--) {
    const code = from.charCodeAt(length)

    if (code === codeOfSlash) {
      if (p !== nmLen) {
        paths.push(from.slice(0, last) + "/node_modules")
      }
      last = length
      p = 0
    } else if (p !== -1) {
      if (nmChars[p] === code) {
        ++p
      } else {
        p = -1
      }
    }
  }

  // Append /node_modules to handle root paths.
  paths.push("/node_modules")

  return paths
}

export default process.platform === "win32"
  ? win32NodeModulePaths
  : posixNodeModulePaths
