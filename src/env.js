import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

import _resolveFilename from "./module/_resolve-filename.js"
import isObjectLike from "./util/is-object-like.js"
import isPath from "./util/is-path.js"
import keys from "./util/keys.js"
import parseJSON from "./util/parse-json.js"
import realpath from "./fs/realpath.js"
import { resolve } from "path"
import rootModule from "./root-module.js"

const codeOfBracket = "{".charCodeAt(0)
const codeOfDash = "-".charCodeAt(0)

const { _preloadModules, argv, cwd } = process
const { isArray } = Array

const esmPath = __non_webpack_module__.filename
const params = argv.slice(2)

const nmIndex = params.length
  ? argv[1].replace(/\\/g, "/").lastIndexOf("/node_modules/")
  : -1

const preloading =
  hasLoaderModule(_preloadModules) ||
  (rootModule.id === "internal/preload" &&
   hasLoaderModule(rootModule.children))

function hasLoaderModule(modules) {
  return isArray(modules) &&
    modules.some(({ filename }) => filename === esmPath)
}

function hasLoaderParam(params) {
  for (let param of params) {
    if (param.charCodeAt(0) === codeOfBracket) {
      const parsed = parseJSON(param)

      if (parsed !== null) {
        param = parsed
      }
    }

    if (hasLoaderValue(param)) {
      return true
    }
  }

  return false
}

function hasLoaderValue(value) {
  if (typeof value === "string") {
    if (isPath(value)) {
      if (realpath(resolve(value)) === esmPath) {
        return true
      }
    } else if (value.charCodeAt(0) !== codeOfDash &&
        _resolveFilename(value, rootModule) === esmPath) {
      return true
    }
  } else if (isObjectLike(value)) {
    const names = keys(value)

    for (const name of names) {
      if (hasLoaderValue(value[name])) {
        return true
      }
    }
  }

  return false
}

const env = new FastObject

env.preload =
  preloading &&
  argv.length > 1

env.repl =
  (preloading && argv.length < 2) ||
  (rootModule.filename === null &&
   rootModule.id === "<repl>" &&
   rootModule.loaded === false &&
   rootModule.parent === void 0 &&
   hasLoaderModule(rootModule.children))

env.cli =
  ! env.preload &&
  ! env.repl &&
  nmIndex !== -1 &&
  hasLoaderParam(params) &&
  (PkgInfo.get(cwd()) !== null ||
   PkgInfo.get(realpath(argv[1].slice(0, nmIndex + 1))) !== null)

export default env
