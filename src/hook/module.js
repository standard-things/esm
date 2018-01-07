import { extname as _extname, dirname, resolve } from "path"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Module from "../module.js"
import NullObject from "../null-object.js"
import PkgInfo from "../pkg-info.js"
import Runtime from "../runtime.js"
import SafeMap from "../safe-map.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import captureStackTrace from "../error/capture-stack-trace.js"
import createSourceMap from "../util/create-source-map.js"
import encodeId from "../util/encode-id.js"
import encodeURI from "../util/encode-uri.js"
import env from "../env.js"
import errors from "../errors.js"
import extname from "../path/extname.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getSourceMappingURL from "../util/get-source-mapping-url.js"
import getURLFromFilePath from "../util/get-url-from-file-path.js"
import gunzip from "../fs/gunzip.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isObjectLike from "../util/is-object-like.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import { satisfies } from "semver"
import setProperty from "../util/set-property.js"
import stat from "../fs/stat.js"
import toOptInError from "../util/to-opt-in-error.js"
import validateESM from "../module/esm/validate.js"
import warn from "../warn.js"

const { setPrototypeOf } = Object

const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]

const compileSym = Symbol.for("@std/esm:module._compile")
const mjsSym = Symbol.for('@std/esm:Module._extensions[".mjs"]')

function hook(Mod, parent, options) {
  let defaultPkgInfo
  let allowTopLevelAwait = satisfies(process.version, ">=7.6.0")

  const { _extensions } = Mod
  const passthruMap = new SafeMap

  const overwriteOptions = isObjectLike(options)
    ? PkgInfo.createOptions(options)
    : null

  Module._extensions = _extensions

  function getDefaultPkgInfo() {
    if (defaultPkgInfo) {
      return defaultPkgInfo
    }

    defaultPkgInfo = new PkgInfo("", "*", { cache: false })
    const defaultOptions = defaultPkgInfo.options
    const parentPkgInfo = PkgInfo.from(parent, true)

    assign(defaultPkgInfo, parentPkgInfo)
    defaultPkgInfo.options = assign(defaultOptions, parentPkgInfo.options)
    defaultPkgInfo.range = "*"

    if (defaultPkgInfo.options.esm === "all") {
      defaultPkgInfo.options.esm = "js"
    }

    return defaultPkgInfo
  }

  function managerWrapper(manager, func, args) {
    const [, filePath] = args
    const pkgInfo = PkgInfo.get(dirname(filePath)) || getDefaultPkgInfo()
    const wrapped = Wrapper.find(_extensions, ".js", pkgInfo.range)

    assign(pkgInfo.options, overwriteOptions)

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
    const ext = extname(filePath)
    const entry = Entry.get(mod)

    entry.data.package = pkgInfo
    entry.filePath = filePath
    entry.options = options

    const cacheFileName = getCacheFileName(entry, cacheKey)
    const stateHash = getCacheStateHash(cacheFileName)
    const runtimeName = encodeId("_" + stateHash.slice(0, 3))

    entry.runtimeName = runtimeName

    let hint = "script"
    let type = "script"

    if (options.esm === "all") {
      type = "module"
    } else if (options.esm === "js") {
      type = "unambiguous"
    }

    if (ext === ".mjs" ||
        ext === ".mjs.gz") {
      hint = "module"

      if (type === "script") {
        type = "module"
      }
    }

    let cached = cache[cacheFileName]

    if (cached === true) {
      const code = readCachedCode(resolve(cachePath, cacheFileName), options)

      if (code === null) {
        cached = null
        delete cache[cacheFileName]
      } else {
        cached =
        entry.data.compile =
        cache[cacheFileName] = Compiler.from(code)
        entry.esm = cached.esm
      }
    }

    const compileWrapper = (content, filePath) => {
      if (shouldOverwrite) {
        if (shouldRestore) {
          mod._compile = _compile
        } else {
          delete mod._compile
        }
      }

      if (! cached) {
        cached = tryCompileCode(manager, content, entry, cacheFileName, {
          cachePath,
          hint,
          type
        })
      }

      entry.data.compile = cached
      entry.esm = cached.esm

      const { warnings } = cached

      if (options.warnings &&
          moduleState.parsing &&
          warnings) {
        for (const warning of warnings) {
          warn(warning.code, filePath, ...warning.args)
        }
      }

      if (! cached.changed &&
          ! overwriteOptions &&
          pkgInfo === getDefaultPkgInfo()) {
        tryPassthru.call(this, func, args, options)
        return
      }

      if (! entry.url) {
        entry.url = getURLFromFilePath(filePath)
      }

      if (moduleState.parsing) {
        if (entry.esm &&
            entry.state === 1) {
          validateESM(entry)
        }
      } else {
        tryCompileCached(entry)
      }
    }

    if (shouldOverwrite) {
      mod._compile = compileWrapper
      setPrototypeOf(mod, Module.prototype)
    } else {
      setProperty(mod, compileSym, { enumerable: false, value: compileWrapper })
    }

    if (! cached &&
        passthruMap.get(func)) {
      tryPassthru.call(this, func, args, options)
    } else {
      const content = cached ? cached.code : readSourceCode(filePath, options)
      mod._compile(content, filePath)
    }
  }

  function tryCompileCached(entry) {
    const noDepth = moduleState.requireDepth === 0
    const { options } = entry
    const tryCompile = entry.esm ? tryCompileESM : tryCompileCJS

    if (noDepth) {
      stat.cache = new NullObject
    }

    if (options.debug) {
      tryCompile(entry)
    } else {
      try {
        tryCompile(entry)
      } catch (e) {
        const { filename } = entry.module
        const sourceCode = () => readSourceCode(filename, options)
        throw maskStackTrace(e, sourceCode, filename, entry.esm)
      }
    }

    if (noDepth) {
      stat.cache = null
    }
  }

  function tryCompileCJS(entry) {
    const async = useAsyncWrapper(entry) ? "async " :  ""
    const { module:mod, runtimeName } = entry
    const { code } = entry.data.compile

    let content =
      "const " + runtimeName + "=this;" +
      runtimeName + ".r((" + async + "function(global,exports,require){" +
      code + "\n}))"

    content += maybeSourceMap(content, entry)

    const exported = {}

    Runtime.enable(entry, exported)
    mod._compile(content, entry.filePath)
  }

  function tryCompileESM(entry) {
    const async = useAsyncWrapper(entry) ? "async " :  ""
    const { module:mod, options, runtimeName } = entry
    const { code } = entry.data.compile

    let content =
      '"use strict";const ' + runtimeName + "=this;" +
      runtimeName + ".r((" + async + "function(global" +
      (options.cjs.vars ? ",exports,require" : "") +
      "){" + code + "\n}))"

    content += maybeSourceMap(content, entry)

    const exported = {}
    const moduleWrap = Module.wrap

    const customWrap = (script) => {
      Module.wrap = moduleWrap
      return "(function(){" + script + "\n})"
    }

    if (! options.cjs.vars) {
      Module.wrap = customWrap
    }

    Runtime.enable(entry, exported)

    try {
      mod._compile(content, entry.filePath)
    } finally {
      if (Module.wrap === customWrap) {
        Module.wrap = moduleWrap
      }
    }
  }

  function useAsyncWrapper(entry) {
    const { mainModule } = moduleState

    if (allowTopLevelAwait &&
        mainModule &&
        entry.options.await) {
      const mod = entry.module
      allowTopLevelAwait = false

      if (mainModule === mod ||
          mainModule.children.some((child) => child === mod)) {
        return true
      }
    }

    return false
  }

  exts.forEach((ext) => {
    if (typeof _extensions[ext] !== "function" &&
        (ext === ".mjs" ||
         ext === ".mjs.gz")) {
      _extensions[ext] = mjsCompiler
    }

    const extCompiler = Wrapper.unwrap(_extensions, ext)
    let passthru = typeof extCompiler === "function" && ! extCompiler[mjsSym]

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

function maybeSourceMap(content, entry) {
  const { sourceMap } = entry.options

  if (sourceMap !== false &&
      (env.inspector || sourceMap) &&
      ! getSourceMappingURL(content)) {
    return "//# sourceMappingURL=data:application/json;charset=utf-8," +
      encodeURI(createSourceMap(entry.filePath, content))
  }

  return ""
}

function mjsCompiler(mod, filePath) {
  const error = new errors.Error("ERR_REQUIRE_ESM", mod)
  const { mainModule } = process

  if (mainModule && mainModule.filename === filePath) {
    toOptInError(error)
  }

  throw error
}

function readCachedCode(filePath, options) {
  return readWith(readFileFast, filePath, options)
}

function readSourceCode(filePath, options) {
  return readWith(readFile, filePath, options)
}

function readWith(reader, filePath, options) {
  if (options && options.gz &&
      _extname(filePath) === ".gz") {
    return gunzip(reader(filePath), "utf8")
  }

  return reader(filePath, "utf8")
}

function tryCompileCode(manager, sourceCode, entry, cacheFilename, options) {
  if (entry.options.debug) {
    return Compiler.compile(sourceCode, entry, cacheFilename, options)
  }

  try {
    return Compiler.compile(sourceCode, entry, cacheFilename, options)
  } catch (e) {
    const useURLs = e.sourceType === "module"

    delete e.sourceType
    captureStackTrace(e, manager)
    throw maskStackTrace(e, sourceCode, entry.filePath, useURLs)
  }
}

function tryPassthru(func, args, options) {
  if (options && options.debug) {
    func.apply(this, args)
  } else {
    try {
      func.apply(this, args)
    } catch (e) {
      const [, filePath] = args
      const sourceCode = () => readSourceCode(filePath, options)
      throw maskStackTrace(e, sourceCode, filePath)
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
