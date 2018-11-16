// Based on `Module._initPaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import { delimiter, resolve } from "../../safe/path.js"

import GenericArray from "../../generic/array.js"

import getEnv from "../../util/get-env.js"
import realProcess from "../../real/process.js"
import safeGetEnv from "../../util/safe-get-env.js"
import shared from "../../shared.js"

function init() {
  function initGlobalPaths() {
    const isWin = realProcess.platform === "win32"

    let homeDir
    let nodePath

    if (isWin) {
      homeDir = getEnv("USERPROFILE")
      nodePath = getEnv("HOME")
    } else {
      // Use `safeGetEnv()` to ensure nothing is returned when the setuid bit is set,
      // i.e. when Node is ran with privileges other than the user executing it.
      // https://github.com/nodejs/node/pull/18511
      homeDir = safeGetEnv("HOME")
      nodePath = safeGetEnv("NODE_PATH")
    }

    let paths

    if (homeDir &&
        typeof homeDir === "string") {
      paths = GenericArray.of(
        resolve(homeDir, ".node_modules"),
        resolve(homeDir, ".node_libraries")
      )
    } else {
      paths = GenericArray.of()
    }

    // The executable path, `$PREFIX\node.exe` on Windows or `$PREFIX/lib/node`
    // everywhere else, where `$PREFIX` is the root of the Node.js installation.
    const prefixDir = resolve(realProcess.execPath, "..", isWin ? "" : "..")

    GenericArray.push(paths, resolve(prefixDir, "lib", "node"))

    if (nodePath &&
        typeof nodePath === "string") {
      const nodePaths = nodePath.split(delimiter)
      const oldPaths = paths

      paths = GenericArray.of()

      for (const thePath of nodePaths) {
        if (typeof thePath === "string" &&
            thePath !== "") {
          GenericArray.push(paths, thePath)
        }
      }

      GenericArray.push(paths, ...oldPaths)
    }

    return paths
  }

  return initGlobalPaths
}

export default shared.inited
  ? shared.module.moduleInternalInitGlobalPaths
  : shared.module.moduleInternalInitGlobalPaths = init()
