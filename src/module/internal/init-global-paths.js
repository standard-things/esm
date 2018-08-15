// Based on `Module._initPaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import { delimiter, resolve } from "../../safe/path.js"

import GenericArray from "../../generic/array.js"

import realProcess from "../../real/process.js"
import safeGetEnv from "../../util/safe-get-env.js"

function initGlobalPaths() {
  const { env } = realProcess
  const isWin = realProcess.platform === "win32"

  let homeDir
  let nodePath

  if (isWin) {
    homeDir = env.USERPROFILE
    nodePath = env.HOME
  } else {
    // Use `safeGetEnv()` to ensure nothing is returned when the setuid bit is set,
    // i.e. when Node is ran with privileges other than the user executing it.
    // https://github.com/nodejs/node/pull/18511
    homeDir = safeGetEnv("HOME")
    nodePath = safeGetEnv("NODE_PATH")
  }

  // The executable path, `$PREFIX\node.exe` on Windows or `$PREFIX/lib/node`
  // everywhere else, where `$PREFIX` is the root of the Node.js installation.
  const prefixDir = resolve(realProcess.execPath, "..", isWin ? "" : "..")
  const paths = GenericArray.of(resolve(prefixDir, "lib", "node"))

  if (homeDir) {
    GenericArray.unshift(paths, resolve(homeDir, ".node_libraries"))
    GenericArray.unshift(paths, resolve(homeDir, ".node_modules"))
  }

  if (typeof nodePath !== "string") {
    return paths
  }

  const otherPaths = nodePath.split(delimiter)
  const filtered = GenericArray.filter(otherPaths, Boolean)

  return GenericArray.concat(filtered, paths)
}

export default initGlobalPaths
