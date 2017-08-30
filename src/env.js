import { join, resolve } from "path"

import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

import isPath from "./util/is-path.js"
import realpath from "./fs/realpath.js"
import resolveFilename from "./module/resolve-filename.js"
import rootModule from "./root-module.js"

const { _preloadModules, argv } = process

const codeOfDash = "-".charCodeAt(0)
const esmPath = __non_webpack_module__.filename
const indexPath = join(esmPath, "../index.js")
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
    let resolved = ""

    if (isPath(param)) {
      resolved = realpath(resolve(param))
    } else if (param.charCodeAt(0) !== codeOfDash) {
      resolved = resolveFilename(param, rootModule)
    }

    if (resolved &&
        (resolved === esmPath || resolved === indexPath)) {
      return true
    }
  }

  return false
}

const env = new FastObject

env.preload =
  rootModule.id === "internal/preload" ||
  hasLoaderModule(_preloadModules)

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
  PkgInfo.get(realpath(argv[1].slice(0, nmIndex))) !== null

export default env
