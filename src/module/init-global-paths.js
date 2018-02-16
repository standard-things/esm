// Based on Node"s `Module._initPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { delimiter, resolve } from "path"

import GenericArray from "../generic/array.js"
import GenericString from "../generic/string.js"

function initGlobalPaths() {
  const { env } = process
  const isWin = process.platform === "win32"
  const homeDir = env[isWin ? "USERPROFILE" : "HOME"]

  // The executable path, `$PREFIX\node.exe` on Windows or `$PREFIX/lib/node`
  // everywhere else, where `$PREFIX` is the root of the Node.js installation.
  const prefixDir = resolve(process.execPath, "..", isWin ? "" : "..")
  const paths = [resolve(prefixDir, "lib", "node")]

  if (homeDir) {
    GenericArray.unshift(paths, resolve(homeDir, ".node_libraries"))
    GenericArray.unshift(paths, resolve(homeDir, ".node_modules"))
  }

  const { NODE_PATH } = env

  if (typeof NODE_PATH !== "string") {
    return paths
  }

  const otherPaths = GenericString.split(NODE_PATH, delimiter)
  const filtered = GenericArray.filter(otherPaths, Boolean)

  return GenericArray.concat(filtered, paths)
}

export default initGlobalPaths
