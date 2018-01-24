import { extname, resolve } from "path"

import Entry from "../entry.js"
import Module from "../module.js"
import PkgInfo from "../pkg-info.js"
import SafeMap from "../safe-map.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import compile from "../module/_compile.js"
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getEnvVars from "../env/get-vars.js"
import gunzip from "../fs/gunzip.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isFile from "../util/is-file.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import setProperty from "../util/set-property.js"
import toOptInError from "../util/to-opt-in-error.js"

const { setPrototypeOf } = Object

const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]

const compileSym = Symbol.for("@std/esm:module._compile")
const mjsSym = Symbol.for('@std/esm:Module._extensions[".mjs"]')

function hook(Mod, parent) {
  const { _extensions } = Mod
  const passthruMap = new SafeMap

  const defaultPkgInfo = new PkgInfo("", "*", { cache: false })
  const defaultOptions = defaultPkgInfo.options
  let parentPkgInfo = PkgInfo.from(parent)

  if (parentPkgInfo) {
    assign(defaultPkgInfo, parentPkgInfo)
    assign(defaultOptions, parentPkgInfo.options)
  }

  if (! parent) {
    const { ESM_OPTIONS } = getEnvVars()

    if (ESM_OPTIONS) {
      assign(defaultOptions, PkgInfo.createOptions(ESM_OPTIONS))
    }
  }

  if (! parentPkgInfo) {
    parentPkgInfo = PkgInfo.from(parent, true)
    assign(parentPkgInfo.options, defaultOptions)
    assign(defaultPkgInfo, parentPkgInfo)
  }

  if (defaultOptions.esm === "all") {
    defaultOptions.esm = "js"
  }

  defaultPkgInfo.options = defaultOptions
  defaultPkgInfo.range = "*"

  Module._extensions = _extensions
  PkgInfo.defaultPkgInfo = defaultPkgInfo

  function managerWrapper(manager, func, args) {
    const [, filePath] = args
    const pkgInfo = PkgInfo.from(filePath)
    const wrapped = Wrapper.find(_extensions, ".js", pkgInfo.range)

    return wrapped
      ? wrapped.call(this, manager, func, pkgInfo, args)
      : tryPassthru.call(this, func, args, pkgInfo.options)
  }

  function methodWrapper(manager, func, pkgInfo, args) {
    const [mod, filePath] = args
    const shouldOverwrite = ! Entry.has(mod)
    const shouldRestore = shouldOverwrite && has(mod, "_compile")

    const { _compile } = mod
    const { cache, cachePath, options } = pkgInfo

    const cacheKey = mtime(filePath)
    const entry = Entry.get(mod)

    entry.package = pkgInfo
    entry.filePath = filePath

    const cacheFileName = getCacheFileName(entry, cacheKey)
    const stateHash = getCacheStateHash(cacheFileName)
    const runtimeName = encodeId("_" + stateHash.slice(0, 3))

    entry.cacheFileName = cacheFileName
    entry.runtimeName = runtimeName

    let cached = cache[cacheFileName]

    if (cached === true &&
        ! isFile(resolve(cachePath, cacheFileName))) {
      cached = null
      delete cache[cacheFileName]
    }

    const compileWrapper = (content, filePath) => {
      if (shouldOverwrite) {
        if (shouldRestore) {
          mod._compile = _compile
        } else {
          delete mod._compile
        }
      }

      if (! compile(entry, content, filePath)) {
        entry.state = 3
        return tryPassthru.call(this, func, args, options)
      }
    }

    setPrototypeOf(mod, Module.prototype)

    if (shouldOverwrite) {
      mod._compile = compileWrapper
    } else {
      setProperty(mod, compileSym, { enumerable: false, value: compileWrapper })
    }

    if (! cached &&
        passthruMap.get(func)) {
      tryPassthru.call(this, func, args, options)
    } else {
      const content = cached ? "" : readSourceCode(filePath, options)
      mod._compile(content, filePath)
    }
  }

  exts.forEach((ext) => {
    if (typeof _extensions[ext] !== "function" &&
        (ext === ".mjs" ||
         ext === ".mjs.gz")) {
      _extensions[ext] = mjsCompiler
    }

    const extCompiler = Wrapper.unwrap(_extensions, ext)

    let passthru =
      typeof extCompiler === "function" &&
      ! extCompiler[mjsSym]

    if (passthru &&
        ext === ".mjs") {
      try {
        extCompiler()
      } catch (e) {
        if (isError(e) &&
            e.code === "ERR_REQUIRE_ESM") {
          passthru = false
        }
      }
    }

    Wrapper.manage(_extensions, ext, managerWrapper)
    Wrapper.wrap(_extensions, ext, methodWrapper)

    passthruMap.set(extCompiler, passthru)
    moduleState._extensions[ext] = _extensions[ext]
  })
}

function mjsCompiler(mod, filePath) {
  const error = new errors.Error("ERR_REQUIRE_ESM", mod)
  const { mainModule } = moduleState

  if (mainModule &&
      mainModule.filename === filePath) {
    toOptInError(error)
  }

  throw error
}

function readSourceCode(filePath, options) {
  if (options && options.gz &&
      extname(filePath) === ".gz") {
    return gunzip(readFile(filePath), "utf8")
  }

  return readFile(filePath, "utf8")
}

function tryPassthru(func, args, options) {
  if (options && options.debug) {
    func.apply(this, args)
  } else {
    try {
      func.apply(this, args)
    } catch (e) {
      if (isStackTraceMasked(e)) {
        throw e
      }

      const [, filePath] = args
      const content = () => readSourceCode(filePath, options)
      throw maskStackTrace(e, content, filePath)
    }
  }
}

setProperty(mjsCompiler, mjsSym, {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
})

export default hook
