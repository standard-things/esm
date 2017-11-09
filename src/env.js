import FastObject from "./fast-object.js"
import PkgInfo from "./pkg-info.js"

import _resolveFilename from "./module/_resolve-filename.js"
import binding from "./binding.js"
import has from "./util/has.js"
import isObjectLike from "./util/is-object-like.js"
import isPath from "./util/is-path.js"
import normalize from "./path/normalize.js"
import parseJSON from "./util/parse-json.js"
import readJSON from "./fs/read-json.js"
import realpath from "./fs/realpath.js"
import { resolve } from "path"
import rootModule from "./root-module.js"

const codeOfBracket = "{".charCodeAt(0)
const codeOfDash = "-".charCodeAt(0)

const debugArgRegExp = /^--(?:debug|inspect)(?:-brk)?$/

const { children, id } = rootModule
const { argv } = process
const { isArray } = Array
const { keys } = Object
const { parent } = __non_webpack_module__

const args = argv.slice(2)
const inspectorBinding = binding.inspector

const esmPath = __non_webpack_module__.filename
const [, filePath] = argv
const parentFilename = parent && normalize(parent.filename)

const nmIndex = args.length
  ? normalize(filePath).lastIndexOf("/node_modules/")
  : -1

const nycIndex = parentFilename
  ? parentFilename.lastIndexOf("/node_modules/nyc/")
  : -1

const nycJSON = nycIndex === -1
  ? null
  : readJSON(parentFilename.slice(0, nycIndex + 18) + "package.json")

const loading =
  nmIndex !== -1 &&
  hasLoaderArg(args) &&
  (PkgInfo.get(process.cwd()) !== null ||
  PkgInfo.get(realpath(filePath.slice(0, nmIndex + 1))) !== null)

const nyc =
  has(nycJSON, "name") &&
  nycJSON.name === "nyc"

const preloading =
  hasLoaderModule(process._preloadModules) ||
  (id === "internal/preload" &&
   hasLoaderModule(children))

function hasDebugArg(args) {
  return args.some((arg) => debugArgRegExp.test(arg))
}

function hasLoaderArg(args) {
  return args.some((arg) =>
    arg.charCodeAt(0) === codeOfBracket
      ? hasLoaderValue(parseJSON(arg) || arg)
      : hasLoaderValue(arg)
  )
}

function hasLoaderModule(modules) {
  return isArray(modules) &&
    modules.some(({ filename }) => filename === esmPath)
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

env.inspector =
  hasDebugArg(process.execArgv) ||
  (typeof inspectorBinding.isEnabled === "function" &&
   inspectorBinding.isEnabled())

env.preload =
  preloading &&
  argv.length > 1

env.repl =
  (preloading && argv.length < 2) ||
  (id === "<repl>" &&
   rootModule.filename === null &&
   rootModule.loaded === false &&
   rootModule.parent == null &&
   hasLoaderModule(children))

env.cli =
  ! env.preload &&
  ! env.repl &&
  (loading || nyc)

export default env
