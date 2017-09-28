import { extname as _extname, dirname, resolve } from "path"

import NullObject from "../null-object.js"
import PkgInfo from "../pkg-info.js"
import Runtime from "../runtime.js"
import SafeMap from "../safe-map.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import binding from "../binding.js"
import captureStackTrace from "../error/capture-stack-trace.js"
import compiler from "../caching-compiler.js"
import createSourceMap from "../util/create-source-map.js"
import encodeId from "../util/encode-id.js"
import encodeURI from "../util/encode-uri.js"
import env from "../env.js"
import errors from "../errors.js"
import extname from "../path/extname.js"
import fs from "fs"
import getCacheFileName from "../util/get-cache-file-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getSourceMappingURL from "../util/get-source-mapping-url.js"
import gunzip from "../fs/gunzip.js"
import hasPragma from "../parse/has-pragma.js"
import isError from "../util/is-error.js"
import isObject from "../util/is-object.js"
import isObjectLike from "../util/is-object-like.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import { satisfies } from "semver"
import setProperty from "../util/set-property.js"
import setSourceType from "../util/set-source-type.js"
import stat from "../fs/stat.js"

const fsBinding = binding.fs
const extSym = Symbol.for("@std/esm:extensions")

const extDescriptor = {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
}

function hook(Module, parent, options) {
  options = isObjectLike(options) ? PkgInfo.createOptions(options) : null

  const { _extensions } = Module
  const passthruMap = new SafeMap

  const parentFilename = parent && parent.filename
  const parentPkgInfo = options && parentFilename
    ? PkgInfo.get(dirname(parentFilename))
    : null

  let allowTopLevelAwait = isObject(process.mainModule) &&
    satisfies(process.version, ">=7.6.0")

  function managerWrapper(manager, func, args) {
    const [, filePath] = args
    const dirPath = dirname(filePath)
    let pkgInfo = options ? null : PkgInfo.get(dirPath)

    if (options) {
      pkgInfo = PkgInfo.read(dirPath, true)
      PkgInfo.set(dirPath, pkgInfo)
      assign(pkgInfo.options, options)

      if (parentPkgInfo) {
        pkgInfo.cache = parentPkgInfo.cache
        pkgInfo.cachePath = parentPkgInfo.cachePath
      }
    }

    const wrapped = (pkgInfo && pkgInfo.options)
      ? Wrapper.find(_extensions, ".js", pkgInfo.range)
      : null

    return wrapped
      ? wrapped.call(this, manager, func, pkgInfo, args)
      : tryPassthruCompile.call(this, func, args)
  }

  // eslint-disable-next-line consistent-return
  function methodWrapper(manager, func, pkgInfo, args) {
    const [mod, filePath] = args
    const ext = extname(filePath)
    const { options } = pkgInfo

    let hint = "script"
    let type = "script"

    if (options.esm === "all") {
      type = "module"
    } else if (options.esm === "js") {
      type = "unambiguous"
    }

    if (ext === ".mjs" || ext === ".mjs.gz") {
      hint = "module"
      if (type === "script") {
        type = "module"
      }
    }

    const { cache, cachePath } = pkgInfo
    const cacheKey = mtime(filePath)
    const cacheFileName = getCacheFileName(filePath, cacheKey, pkgInfo)

    const stateHash = getCacheStateHash(cacheFileName)
    const runtimeAlias = encodeId("_" + stateHash.slice(0, 3))

    let cacheCode
    let sourceCode
    let cacheValue = cache[cacheFileName]

    if (cacheValue === true) {
      cacheCode = readCode(resolve(cachePath, cacheFileName), options)
    } else {
      sourceCode = readCode(filePath, options)
    }

    if (! isObject(cacheValue)) {
      if (cacheValue === true) {
        if (type === "unambiguous") {
          type = hasPragma(cacheCode, "use script") ? "script" : "module"
        }

        cacheValue = { code: cacheCode, type }
        cache[cacheFileName] = cacheValue
      } else {
        cacheValue = tryCodeCompile(manager, sourceCode, {
          cacheFileName,
          cachePath,
          filePath,
          hint,
          pkgInfo,
          runtimeAlias,
          type
        })
      }
    }

    const noDepth = moduleState.requireDepth === 0

    if (noDepth) {
      stat.cache = new NullObject
    }

    const tryModuleCompile = cacheValue.type === "module" ? tryESMCompile : tryCJSCompile
    tryModuleCompile.call(this, manager, func, mod, cacheValue.code, filePath, runtimeAlias, options)

    if (noDepth) {
      stat.cache = null
    }
  }

  function readCode(filePath, options) {
    if (options && options.gz &&
        _extname(filePath) === ".gz") {
      return gunzip(readFile(filePath), "utf8")
    }

    return readFile(filePath, "utf8")
  }

  function tryCodeCompile(manager, code, options) {
    const { filePath, pkgInfo } = options

    if (pkgInfo.options.debug) {
      return compiler.compile(code, options)
    }

    try {
      return compiler.compile(code, options)
    } catch (e) {
      captureStackTrace(e, manager)
      throw maskStackTrace(e, code, filePath)
    }
  }

  function tryCJSCompile(manager, func, mod, content, filePath, runtimeAlias, options) {
    content =
      "const " + runtimeAlias + "=this;" +
      runtimeAlias + ".r((function(exports,require){" + content + "\n}))"

    const exported = {}
    setSourceType(exported, "script")
    Runtime.enable(mod, exported, options)
    tryModuleCompile.call(this, manager, func, mod, content, filePath, options)
  }

  function tryESMCompile(manager, func, mod, content, filePath, runtimeAlias, options) {
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
      (options.cjs ? "exports,require" : "") +
      "){" + content + "\n}))"

    const exported = {}
    const Ctor = mod.constructor
    const moduleWrap = Ctor.wrap

    const customWrap = (script) => {
      Ctor.wrap = moduleWrap
      return "(function(){" + script + "\n})"
    }

    if (! options.cjs) {
      Ctor.wrap = customWrap
    }

    setSourceType(exported, "module")
    Runtime.enable(mod, exported, options)

    try {
      tryModuleCompile.call(this, manager, func, mod, content, filePath, options)
    } finally {
      if (Ctor.wrap === customWrap) {
        Ctor.wrap = moduleWrap
      }
    }
  }

  function tryModuleCompile(manager, func, mod, content, filePath, options) {
    const moduleCompile = mod._compile
    const moduleReadFile = fsBinding.internalModuleReadFile
    const passthru = passthruMap.get(func)
    const { readFileSync } = fs

    let restored = false

    const readAndRestore = () => {
      restored = true

      if (typeof moduleReadFile === "function") {
        fsBinding.internalModuleReadFile = moduleReadFile
      }

      fs.readFileSync = readFileSync
      return content
    }

    const customModuleCompile = function (content, compilePath) {
      if (! restored && compilePath === filePath) {
        // This fallback is only hit if the read file wrappers are missed,
        // which should never happen.
        content = readAndRestore()
      }

      mod._compile = moduleCompile
      return moduleCompile.call(this, content, compilePath)
    }

    const customModuleReadFile = function (readPath) {
      return readPath === filePath
        ? readAndRestore()
        : moduleReadFile.call(this, readPath)
    }

    const customReadFileSync = function (readPath, readOptions) {
      return readPath === filePath
        ? readAndRestore()
        : readFileSync.call(this, readPath, readOptions)
    }

    if (typeof moduleReadFile === "function") {
      // Wrap `process.binding("fs").internalModuleReadFile` in case future
      // versions of Node use it instead of `fs.readFileSync`.
      fsBinding.internalModuleReadFile = customModuleReadFile
    }

    // Wrap `fs.readFileSync` to avoid an extra file read when the passthru
    // `Module._extensions[ext]` is called.
    fs.readFileSync = customReadFileSync

    // Wrap `mod._compile` in the off chance the read file wrappers are missed.
    mod._compile = customModuleCompile

    // Add an inline source map to mask the source in the inspector.
    if (options.sourceMap !== false &&
        (env.inspector || options.sourceMap) &&
        ! getSourceMappingURL(content)) {
      content +=
        "//# sourceMappingURL=data:application/json;charset=utf-8," +
        encodeURI(createSourceMap(filePath, content))
    }

    try {
      if (options.debug) {
        if (passthru) {
          func.call(this, mod, filePath)
        } else {
          mod._compile(content, filePath)
        }
      } else {
        try {
          if (passthru) {
            func.call(this, mod, filePath)
          } else {
            mod._compile(content, filePath)
          }
        } catch (e) {
          throw maskStackTrace(e, () => readCode(filePath, options))
        }
      }
    } finally {
      if (fsBinding.internalModuleReadFile === customModuleReadFile) {
        fsBinding.internalModuleReadFile = moduleReadFile
      }

      if (fs.readFileSync === customReadFileSync) {
        fs.readFileSync = readFileSync
      }

      if (mod._compile === customModuleCompile) {
        mod._compile = moduleCompile
      }
    }
  }

  function tryPassthruCompile(func, args) {
    try {
      func.apply(this, args)
    } catch (e) {
      const [, filePath] = args
      throw maskStackTrace(e, () => readCode(filePath))
    }
  }

  const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]

  exts.forEach((ext) => {
    if (typeof _extensions[ext] !== "function" &&
        (ext === ".mjs" || ext === ".mjs.gz")) {
      _extensions[ext] = mjsCompiler
    }

    const extCompiler = Wrapper.unwrap(_extensions, ext)

    if (extCompiler) {
      let passthru = ! extCompiler[extSym]

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
    }

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
  throw new errors.Error("ERR_REQUIRE_ESM", filePath)
}

setProperty(mjsCompiler, extSym, extDescriptor)

export default hook
