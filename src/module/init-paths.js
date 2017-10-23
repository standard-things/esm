// Based on Node"s `Module._initPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { delimiter, resolve } from "path"

function initPaths() {
  const { env } = process
  const isWin = process.platform === "win32"
  const homeDir = isWin ? env.USERPROFILE : env.HOME

  // The executable path, `$PREFIX\node.exe` on Windows or `$PREFIX/lib/node`
  // everywhere else, where `$PREFIX` is the root of the Node.js installation.
  const prefixDir = resolve(process.execPath, "..", isWin ? "" : "..")
  const paths = [resolve(prefixDir, "lib", "node")]

  if (homeDir) {
    paths.unshift(resolve(homeDir, ".node_libraries"))
    paths.unshift(resolve(homeDir, ".node_modules"))
  }

  const { NODE_PATH } = env

  return typeof NODE_PATH === "string"
    ? NODE_PATH.split(delimiter).filter(Boolean).concat(paths)
    : paths
}

export default initPaths
