import { dirname, resolve } from "path"

import Module from "../module.js"
import PkgInfo from "../pkg-info.js"

import _loadESM from "../module/esm/_load.js"
import _resolveFilename from "../module/esm/_resolve-filename.js"
import assign from "../util/assign.js"
import builtinModules from "../builtin-modules.js"
import isPath from "../util/is-path.js"
import moduleState from "../module/state.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import parseJSON6 from "../util/parse-json6.js"
import readFile from "../fs/read-file.js"

const codeOfBracket = "{".charCodeAt(0)
const codeOfDoubleQuote = '"'.charCodeAt(0)
const codeOfSingleQuote = "'".charCodeAt(0)

function hook(Mod) {
  const _tickCallback = noDeprecationWarning(() => process._tickCallback)
  const { runMain } = Mod

  const useTickCallback = typeof _tickCallback === "function"

  const cwd = process.cwd()
  const defaultPkgInfo = new PkgInfo("", "*", { cache: false })
  const defaultOptions = defaultPkgInfo.options

  let cwdPkgInfo = PkgInfo.get(cwd)

  if (! cwdPkgInfo) {
    cwdPkgInfo = PkgInfo.get(cwd, true)
    PkgInfo.set(cwd, defaultPkgInfo)
  }

  assign(defaultPkgInfo, cwdPkgInfo)
  defaultPkgInfo.options = assign(defaultOptions, cwdPkgInfo.options)
  defaultPkgInfo.range = "*"

  if (defaultPkgInfo.options.esm === "all") {
    defaultPkgInfo.options.esm = "js"
  }

  let ESM_OPTIONS = process.env && process.env.ESM_OPTIONS

  if (ESM_OPTIONS) {
    ESM_OPTIONS = ESM_OPTIONS.trim()

    if (isPath(ESM_OPTIONS)) {
      ESM_OPTIONS = readFile(resolve(ESM_OPTIONS), "utf8")
    }

    const code0 = ESM_OPTIONS.charCodeAt(0)

    if (code0 === codeOfBracket ||
        code0 === codeOfDoubleQuote ||
        code0 === codeOfSingleQuote) {
      ESM_OPTIONS = parseJSON6(ESM_OPTIONS)
    }

    assign(defaultPkgInfo.options, PkgInfo.createOptions(ESM_OPTIONS))
  }

  Mod.runMain = () => {
    Mod.runMain = runMain

    const [, mainPath] = process.argv

    if (mainPath in builtinModules) {
      Mod.runMain()
      return
    }

    let filePath

    try {
      filePath = _resolveFilename(mainPath, null, true)
    } catch (e) {
      filePath = Module._resolveFilename(mainPath, null, true)
    }

    const dirPath = dirname(filePath)
    const pkgInfo = PkgInfo.get(dirPath) || defaultPkgInfo

    PkgInfo.set(dirPath, pkgInfo)

    moduleState.preload = true

    let child

    try {
      child = _loadESM(filePath, null, true)
    } finally {
      moduleState.preload = false

      if (child) {
        child.loaded = false
        child.preloaded = true
      }
    }

    _loadESM(filePath, null, true)
    tickCallback()
  }

  function tickCallback() {
    if (useTickCallback) {
      _tickCallback()
    }
  }
}

export default hook
