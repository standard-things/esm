import { extname as _extname, dirname, resolve } from "path"

import Entry from "../entry.js"
import NullObject from "../null-object.js"
import PkgInfo from "../pkg-info.js"
import Runtime from "../runtime.js"
import SafeMap from "../safe-map.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import captureStackTrace from "../error/capture-stack-trace.js"
import compiler from "../caching-compiler.js"
import createSourceMap from "../util/create-source-map.js"
import emitWarning from "../error/emit-warning.js"
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
import hasPragma from "../parse/has-pragma.js"
import isError from "../util/is-error.js"
import isObject from "../util/is-object.js"
import isObjectLike from "../util/is-object-like.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import { satisfies } from "semver"
import setESM from "../util/set-es-module.js"
import setProperty from "../util/set-property.js"
import stat from "../fs/stat.js"
import toOptInError from "../util/to-opt-in-error.js"

const { compile } = compiler
const compileSym = Symbol.for("@std/esm:module._compile")
const mjsSym = Symbol.for('@std/esm:module._extensions[".mjs"]')

function hook(Mod, parent, options) {
  options = isObjectLike(options) ? PkgInfo.createOptions(options) : null

  const { _extensions } = Mod
  const passthruMap = new SafeMap

  const parentFilename = (parent && parent.filename) || "."
  const parentPkgInfo = PkgInfo.get(dirname(parentFilename))
  const defaultPkgInfo = new PkgInfo("", "*", { cache: false })

  if (parentPkgInfo) {
    defaultPkgInfo.cache = parentPkgInfo.cache
    defaultPkgInfo.cachePath = parentPkgInfo.cachePath
    defaultPkgInfo.dirPath = parentPkgInfo.dirPath
    defaultPkgInfo.options.cache = parentPkgInfo.options.cache
    defaultPkgInfo.options.esm = parentPkgInfo.options.esm
  }

  let allowTopLevelAwait = isObject(process.mainModule) &&
    satisfies(process.version, ">=7.6.0")

  function managerWrapper(manager, func, args) {
    const [, filePath] = args
    const dirPath = dirname(filePath)
    let pkgInfo = options
      ? null
      : (PkgInfo.get(dirPath) || defaultPkgInfo)

    if (options) {
      pkgInfo = PkgInfo.get(dirPath, true)
      assign(pkgInfo.options, options)

      if (parentPkgInfo) {
        pkgInfo.cache = parentPkgInfo.cache
        pkgInfo.cachePath = parentPkgInfo.cachePath
      }
    }

    const wrapped = pkgInfo && pkgInfo.options
      ? Wrapper.find(_extensions, ".js", pkgInfo.range)
      : null

    return wrapped
      ? wrapped.call(this, manager, func, pkgInfo, args)
      : tryPassthru.call(this, func, args, options)
  }

  function methodWrapper(manager, func, pkgInfo, args) {
    const [mod, filePath] = args
    const { _compile } = mod
    const { options } = pkgInfo

    const shouldOverwrite = env.cli
    const shouldRestore = shouldOverwrite && has(mod, "_compile")

    const compileWrapper = (content, filePath) => {
      if (shouldOverwrite) {
        if (shouldRestore) {
          mod._compile = _compile
        } else {
          delete mod._compile
        }
      }

      let hint = "script"
      let type = "script"

      if (options.esm === "all") {
        type = "module"
      } else if (options.esm === "js") {
        type = "unambiguous"
      }

      const ext = extname(filePath)

      if (ext === ".mjs" || ext === ".mjs.gz") {
        hint = "module"
        if (type === "script") {
          type = "module"
        }
      }

      if (! Entry.has(mod)) {
        const entry = Entry.get(mod)
        entry.url = getURLFromFilePath(filePath)
      }

      const { cache, cachePath } = pkgInfo
      const cacheKey = mtime(filePath)
      const cacheFileName = getCacheFileName(filePath, cacheKey, pkgInfo)

      const stateHash = getCacheStateHash(cacheFileName)
      const runtimeAlias = encodeId("_" + stateHash.slice(0, 3))

      let code
      let cached = cache[cacheFileName]

      if (cached === true) {
        code = readCode(resolve(cachePath, cacheFileName), options)

        if (type === "unambiguous") {
          type = hasPragma(code, "use script") ? "script" : "module"
        }

        cached =
        cache[cacheFileName] = { code, esm: type === "module" }
      }

      if (! isObject(cached)) {
        cached = tryCompileCode(manager, content, {
          cacheFileName,
          cachePath,
          filePath,
          hint,
          pkgInfo,
          runtimeAlias,
          type
        })
      }

      if (cached.warnings) {
        for (const warning of cached.warnings) {
          emitWarning(warning.message + ": " + filePath)
        }
      }

      tryCompileCached(mod, cached, filePath, runtimeAlias, options)
    }

    if (shouldOverwrite) {
      mod._compile = compileWrapper
    } else {
      setProperty(mod, compileSym, { enumerable: false, value: compileWrapper })
    }

    if (passthruMap.get(func)) {
      tryPassthru.call(this, func, args, options)
    } else {
      mod._compile(readCode(filePath, options), filePath)
    }
  }

  function maybeSourceMap(content, filePath, options) {
    if (options.sourceMap !== false &&
        (env.inspector || options.sourceMap) &&
        ! getSourceMappingURL(content)) {
      return "//# sourceMappingURL=data:application/json;charset=utf-8," +
        encodeURI(createSourceMap(filePath, content))
    }

    return ""
  }

  function readCode(filePath, options) {
    if (options && options.gz &&
        _extname(filePath) === ".gz") {
      return gunzip(readFile(filePath), "utf8")
    }

    return readFile(filePath, "utf8")
  }

  function tryCompileCached(mod, cached, filePath, runtimeAlias, options) {
    const { code } = cached
    const noDepth = moduleState.requireDepth === 0
    const tryCompile = cached.esm ? tryCompileESM : tryCompileCJS

    if (noDepth) {
      stat.cache = new NullObject
    }

    if (options.debug) {
      tryCompile(mod, code, filePath, runtimeAlias, options)
    } else {
      try {
        tryCompile(mod, code, filePath, runtimeAlias, options)
      } catch (e) {
        throw maskStackTrace(e, () => readCode(filePath, options))
      }
    }

    if (noDepth) {
      stat.cache = null
    }
  }

  function tryCompileCode(manager, code, options) {
    const { filePath, pkgInfo } = options

    if (pkgInfo.options.debug) {
      return compile(code, options)
    }

    try {
      return compile(code, options)
    } catch (e) {
      captureStackTrace(e, manager)
      throw maskStackTrace(e, code, filePath)
    }
  }

  function tryCompileCJS(mod, content, filePath, runtimeAlias, options) {
    content =
      "const " + runtimeAlias + "=this;" +
      runtimeAlias + ".r((function(exports,require){" + content + "\n}))"

    content +=
      maybeSourceMap(content, filePath, options)

    const exported = {}

    setESM(exported, false)
    Runtime.enable(mod, exported, options)
    mod._compile(content, filePath)
  }

  function tryCompileESM(mod, content, filePath, runtimeAlias, options) {
    let async = ""

    if (allowTopLevelAwait && options.await) {
      allowTopLevelAwait = false
      if (process.mainModule === mod ||
          process.mainModule.children.some((child) => child === mod)) {
        async = "async "
      }
    }

    content =
      '"use strict";const ' + runtimeAlias + "=this;" +
      runtimeAlias + ".r((" + async + "function(" +
      (options.cjs.vars ? "exports,require" : "") +
      "){" + content + "\n}))"

    content +=
      maybeSourceMap(content, filePath, options)

    const Ctor = mod.constructor
    const exported = {}
    const moduleWrap = Ctor.wrap

    const customWrap = (script) => {
      Ctor.wrap = moduleWrap
      return "(function(){" + script + "\n})"
    }

    if (! options.cjs.vars) {
      Ctor.wrap = customWrap
    }

    setESM(exported, true)
    Runtime.enable(mod, exported, options)

    try {
      mod._compile(content, filePath)
    } finally {
      if (Ctor.wrap === customWrap) {
        Ctor.wrap = moduleWrap
      }
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
        throw maskStackTrace(e, () => readCode(filePath, options))
      }
    }
  }

  const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]

  exts.forEach((ext) => {
    if (typeof _extensions[ext] !== "function" &&
        (ext === ".mjs" || ext === ".mjs.gz")) {
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

    passthruMap.set(extCompiler, passthru)

    if (ext === ".js" &&
        moduleState.extensions !== _extensions) {
      Wrapper.manage(moduleState.extensions, ext, managerWrapper)
      Wrapper.wrap(moduleState.extensions, ext, methodWrapper)
    }

    Wrapper.manage(_extensions, ext, managerWrapper)
    Wrapper.wrap(_extensions, ext, methodWrapper)
  })
}

function mjsCompiler(mod, filePath) {
  const error = new errors.Error("ERR_REQUIRE_ESM", filePath)
  const { mainModule } = process

  if (mainModule && mainModule.filename === filePath) {
    toOptInError(error)
  }

  throw error
}

setProperty(mjsCompiler, mjsSym, {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
})

export default hook
