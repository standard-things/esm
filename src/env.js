import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

import isPath from "./util/is-path.js"
import realpath from "./fs/realpath.js"
import { resolve } from "path"
import resolveFilename from "./module/resolve-filename.js"
import rootModule from "./root-module.js"

const { _preloadModules, argv } = process

const codeOfDash = "-".charCodeAt(0)
const esmPath = __non_webpack_module__.filename
const params = argv.slice(2)

const nmIndex = params.length
  ? argv[1].replace(/\\/g, "/").lastIndexOf("/node_modules/")
  : -1

function hasLoaderModule(modules) {
  return Array.isArray(modules) &&
    modules.some(({ filename }) => filename === esmPath)
}

function hasLoaderParam(params) {
  for (const param of params) {
    if (isPath(param)) {
      if (realpath(resolve(param)) === esmPath) {
        return true
      }
    } else if (param.charCodeAt(0) !== codeOfDash &&
        resolveFilename(param, rootModule) === esmPath) {
      return true
    }
  }

  return false
}

const env = new FastObject

env.preload =
  hasLoaderModule(_preloadModules) ||
  (rootModule.id === "internal/preload" &&
  hasLoaderModule(rootModule.children))

env.repl =
  (env.preload && argv.length < 2) ||
  (rootModule.filename === null &&
  rootModule.id === "<repl>" &&
  rootModule.loaded === false &&
  rootModule.parent === void 0 &&
  hasLoaderModule(rootModule.children))

env.cli =
  ! env.preload &&
  ! env.repl &&
  nmIndex > -1 &&
  hasLoaderParam(params) &&
  PkgInfo.get(realpath(argv[1].slice(0, nmIndex + 1))) !== null

export default env
