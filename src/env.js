import FastObject from "./fast-object.js"
import NullObject from "./null-object.js"
import PkgInfo from "./pkg-info.js"

import _resolveFilename from "./module/esm/_resolve-filename.js"
import binding from "./binding.js"
import has from "./util/has.js"
import isObjectLike from "./util/is-object-like.js"
import isPath from "./util/is-path.js"
import noDeprecationWarning from "./warning/no-deprecation-warning.js"
import normalize from "./path/normalize.js"
import parseJSON from "./util/parse-json.js"
import parseJSON6 from "./util/parse-json6.js"
import readFile from "./fs/read-file.js"
import readJSON from "./fs/read-json.js"
import realpath from "./fs/realpath.js"
import { resolve } from "path"
import rootModule from "./root-module.js"
import shared from "./shared.js"

const codeOfDash = "-".charCodeAt(0)
const codeOfDoubleQuote = '"'.charCodeAt(0)
const codeOfLeftBracket = "{".charCodeAt(0)
const codeOfSingleQuote = "'".charCodeAt(0)

const { isArray } = Array
const { keys } = Object

const _preloadModules = noDeprecationWarning(() => process._preloadModules)
const debugArgRegExp = /^--(?:debug|inspect)(?:-brk)?$/
const stdPath = __non_webpack_module__.filename

const inspectorBinding = binding.inspector
const isInspectorEnabled = noDeprecationWarning(() => inspectorBinding.isEnabled)

function getVars() {
  const vars = new NullObject

  if (! process.env ||
      typeof process.env.ESM_OPTIONS !== "string") {
    return vars
  }

  let ESM_OPTIONS = process.env.ESM_OPTIONS.trim()

  if (isPath(ESM_OPTIONS)) {
    ESM_OPTIONS = readFile(resolve(ESM_OPTIONS), "utf8")
  }

  if (! ESM_OPTIONS) {
    return vars
  }

  const code0 = ESM_OPTIONS.charCodeAt(0)

  if (code0 === codeOfLeftBracket ||
      code0 === codeOfDoubleQuote ||
      code0 === codeOfSingleQuote) {
    ESM_OPTIONS = parseJSON6(ESM_OPTIONS)
  }

  vars.ESM_OPTIONS = ESM_OPTIONS
  return vars
}

function hasDebugArg(args) {
  return args.some((arg) => debugArgRegExp.test(arg))
}

function hasLoaderArg(args) {
  return args.some((arg) =>
    arg.charCodeAt(0) === codeOfLeftBracket
      ? hasLoaderValue(parseJSON(arg))
      : hasLoaderValue(arg)
  )
}

function hasLoaderModule(modules) {
  return isArray(modules) &&
    modules.some(({ filename }) => filename === stdPath)
}

function hasLoaderValue(value) {
  if (typeof value === "string") {
    if (isPath(value)) {
      if (realpath(resolve(value)) === stdPath) {
        return true
      }
    } else if (value.charCodeAt(0) !== codeOfDash &&
        _resolveFilename(value, rootModule) === stdPath) {
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

function isFromNyc() {
  const { parent } = __non_webpack_module__
  const parentFilePath = parent && normalize(parent.filename)

  const nycIndex = parentFilePath
    ? parentFilePath.lastIndexOf("/node_modules/nyc/")
    : -1

  const nycJSON = nycIndex === -1
    ? null
    : readJSON(parentFilePath.slice(0, nycIndex + 18) + "package.json")

  return has(nycJSON, "name") &&
    nycJSON.name === "nyc"
}

function isFromPackage() {
  const { argv } = process
  const [, filePath] = argv
  const args = argv.slice(2)
  const nodeModulesIndex = args.length
    ? normalize(filePath).lastIndexOf("/node_modules/")
    : -1

  // From a package like Mocha.
  if (nodeModulesIndex !== -1 &&
      hasLoaderArg(args) &&
      (PkgInfo.get(process.cwd()) !== null ||
       PkgInfo.get(realpath(filePath.slice(0, nodeModulesIndex + 1))) !== null)) {
    return true
  }

  // From istanbuljs/nyc.
  return isFromNyc()
}

function isFromRequireFlag() {
  return hasLoaderModule(_preloadModules) ||
    (rootModule.id === "internal/preload" &&
     hasLoaderModule(rootModule.children))
}

function isInspector() {
  return shared.env.inspector =
    hasDebugArg(process.execArgv) ||
    (typeof isInspectorEnabled === "function" &&
     isInspectorEnabled.call(inspectorBinding))
}

function isREPL() {
  return shared.env.repl =
    (process.argv.length < 2 &&
     isFromRequireFlag()) ||
    (rootModule.id === "<repl>" &&
     rootModule.filename === null &&
     rootModule.loaded === false &&
     rootModule.parent == null &&
     hasLoaderModule(rootModule.children))
}

function isCLI() {
  return shared.env.cli =
    (process.argv.length > 1 &&
     isFromRequireFlag()) ||
    isFromPackage()
}

const env = new FastObject

env.inspector = "inspector" in shared.env
  ? shared.env.inspector
  : shared.env.inspector = isInspector()

env.repl = "repl" in shared.env
  ? shared.env.repl
  : shared.env.repl = isREPL()

env.vars = "vars" in shared.env
  ? shared.env.vars
  : shared.env.vars = getVars()

// Define last to avoid cyclical error in PkgInfo.
env.cli = "cli" in shared.env
  ? shared.env.cli
  : shared.env.cli = isCLI()

export default env
