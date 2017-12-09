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
import emitWarning from "../warning/emit-warning.js"
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
import readFileFast from "../fs/read-file-fast.js"
import resolveSpecifiers from "../module/resolve-specifiers.js"
import { satisfies } from "semver"
import setESM from "../util/set-es-module.js"
import setProperty from "../util/set-property.js"
import stat from "../fs/stat.js"
import toOptInError from "../util/to-opt-in-error.js"

const { compile } = Compiler
const { setPrototypeOf } = Object

const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]
const compileSym = Symbol.for("@std/esm:module._compile")
const mjsSym = Symbol.for('@std/esm:Module._extensions[".mjs"]')

function hook(Mod, parent, options) {
  let allowTopLevelAwait =
    isObject(process.mainModule) &&
    satisfies(process.version, ">=7.6.0")

  const { _extensions } = Mod
  const passthruMap = new SafeMap

  const defaultPkgInfo = new PkgInfo("", "", { cache: false })
  const defaultOptions = defaultPkgInfo.options

  const overwriteOptions = isObjectLike(options)
    ? PkgInfo.createOptions(options)
    : null

  const parentPkgInfo = PkgInfo.from(parent, true)
  const parentPkgOptions = assign(parentPkgInfo.options, overwriteOptions)

  assign(defaultPkgInfo, parentPkgInfo)
  defaultPkgInfo.options = assign(defaultOptions, parentPkgOptions)
  defaultPkgInfo.range = "*"

  if (parentPkgOptions.esm === "all") {
    defaultPkgInfo.options.esm = "js"
  }

  Module._extensions = _extensions

  function managerWrapper(manager, func, args) {
    const [, filePath] = args
    const pkgInfo = PkgInfo.get(dirname(filePath)) || defaultPkgInfo
    const wrapped = Wrapper.find(_extensions, ".js", pkgInfo.range)

    assign(pkgInfo.options, overwriteOptions)

    return wrapped
      ? wrapped.call(this, manager, func, pkgInfo, args)
      : tryPassthru.call(this, func, args, pkgInfo.options)
  }

  function methodWrapper(manager, func, pkgInfo, args) {
    const [mod, filePath] = args
    const { _compile } = mod
    const { cache, cachePath, options } = pkgInfo
    const cacheKey = mtime(filePath)
    const cacheFileName = getCacheFileName(filePath, cacheKey, pkgInfo)
    const ext = extname(filePath)

    const shouldOverwrite = ! Entry.has(mod)
    const shouldRestore = shouldOverwrite && has(mod, "_compile")

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
        if (type === "unambiguous") {
          type = hasPragma(code, "use script") ? "script" : "module"
        }

        cached =
        cache[cacheFileName] = {
          changed: true,
          code,
          esm: type === "module"
        }
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

      const stateHash = getCacheStateHash(cacheFileName)
      const runtimeName = encodeId("_" + stateHash.slice(0, 3))

      if (! isObject(cached)) {
        cached = tryCompileCode(manager, content, {
          cacheFileName,
          cachePath,
          filePath,
          hint,
          pkgInfo,
          runtimeName,
          type
        })
      }

      if (cached.warnings) {
        for (const warning of cached.warnings) {
          emitWarning(warning.message + ": " + filePath)
        }
      }

      if (! cached.changed &&
          ! overwriteOptions &&
          pkgInfo === defaultPkgInfo) {
        tryPassthru.call(this, func, args, options)
        return
      }

      const entry = Entry.get(mod)
      entry.runtimeName = runtimeName

      if (! entry.url) {
        entry.url = getURLFromFilePath(filePath)
      }

      tryCompileCached(mod, cached, filePath, runtimeName, options)
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

  function maybeSourceMap(content, filePath, options) {
    if (options.sourceMap !== false &&
        (env.inspector || options.sourceMap) &&
        ! getSourceMappingURL(content)) {
      return "//# sourceMappingURL=data:application/json;charset=utf-8," +
        encodeURI(createSourceMap(filePath, content))
    }

    return ""
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

  function tryCompileCached(mod, cached, filePath, runtimeName, options) {
    const noDepth = moduleState.requireDepth === 0
    const tryCompile = cached.esm ? tryCompileESM : tryCompileCJS

    if (noDepth) {
      stat.cache = new NullObject
    }

    if (options.debug) {
      tryCompile(mod, cached.code, filePath, runtimeName, options)
    } else {
      try {
        tryCompile(mod, cached.code, filePath, runtimeName, options)
      } catch (e) {
        const sourceCode = () => readSourceCode(filePath, options)
        throw maskStackTrace(e, sourceCode, filePath, cached.esm)
      }
    }

    if (noDepth) {
      stat.cache = null
    }
  }

  function tryCompileCode(manager, sourceCode, options) {
    const { filePath, pkgInfo } = options

    if (pkgInfo.options.debug) {
      return compile(sourceCode, options)
    }

    try {
      return compile(sourceCode, options)
    } catch (e) {
      const useURLs = e.sourceType === "module"

      delete e.sourceType
      captureStackTrace(e, manager)
      throw maskStackTrace(e, sourceCode, filePath, useURLs)
    }
  }

  function tryCompileCJS(mod, content, filePath, runtimeName, options) {
    content =
      "const " + runtimeName + "=this;" +
      runtimeName + ".r((function(exports,require){" + content + "\n}))"

    content +=
      maybeSourceMap(content, filePath, options)

    const exported = {}

    setESM(exported, false)
    Runtime.enable(mod, exported, options)
    mod._compile(content, filePath)
  }

  function tryCompileESM(mod, content, filePath, runtimeName, options) {
    let async = ""

    if (allowTopLevelAwait && options.await) {
      allowTopLevelAwait = false
      if (process.mainModule === mod ||
          process.mainModule.children.some((child) => child === mod)) {
        async = "async "
      }
    }

    resolveSpecifiers(mod, content)

    content =
      '"use strict";const ' + runtimeName + "=this;" +
      runtimeName + ".r((" + async + "function(" +
      (options.cjs.vars ? "exports,require" : "") +
      "){" + content + "\n}))"

    content +=
      maybeSourceMap(content, filePath, options)

    const exported = {}
    const moduleWrap = Module.wrap

    const customWrap = (script) => {
      Module.wrap = moduleWrap
      return "(function(){" + script + "\n})"
    }

    if (! options.cjs.vars) {
      Module.wrap = customWrap
    }

    setESM(exported, true)
    Runtime.enable(mod, exported, options)

    try {
      mod._compile(content, filePath)
    } finally {
      if (Module.wrap === customWrap) {
        Module.wrap = moduleWrap
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
        const sourceCode = () => readSourceCode(filePath, options)
        throw maskStackTrace(e, sourceCode, filePath)
      }
    }
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
