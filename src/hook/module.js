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
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import extname from "../path/extname.js"
import fs from "fs"
import getCacheFileName from "../util/get-cache-file-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import gunzip from "../fs/gunzip.js"
import hasPragma from "../parse/has-pragma.js"
import isError from "../util/is-error.js"
import isObject from "../util/is-object.js"
import isObjectLike from "../util/is-object-like.js"
import isParseError from "../util/is-parse-error.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import { satisfies } from "semver"
import setProperty from "../util/set-property.js"
import setSourceType from "../util/set-source-type.js"
import stat from "../fs/stat.js"

const fsBinding = binding.fs
const mjsSym = Symbol.for('@std/esm:extensions[".mjs"]')

const trueDescriptor = {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
}

function hook(Module, options) {
  options = isObjectLike(options) ? options : null

  const { _extensions } = Module
  const jsCompiler = Wrapper.unwrap(_extensions, ".js")
  const passthruMap = new SafeMap

  let allowTopLevelAwait = isObject(process.mainModule) &&
    satisfies(process.version, ">=7.6.0")

  function managerWrapper(manager, func, args) {
    const [, filePath] = args
    const dirPath = dirname(filePath)
    let pkgInfo = options === null ? PkgInfo.get(dirPath) : null

    if (options !== null) {
      pkgInfo = PkgInfo.read(dirPath, true)
      PkgInfo.set(dirPath, pkgInfo)
      assign(pkgInfo.options, options)
    }

    if (pkgInfo === null ||
        pkgInfo.options === null) {
      return func.apply(this, args)
    }

    const wrapped = Wrapper.find(_extensions, ".js", pkgInfo.range)

    return wrapped === null
      ? func.apply(this, args)
      : wrapped.call(this, manager, func, pkgInfo, args)
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
        cacheValue = tryCompile(manager, sourceCode, {
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
    return options.gz && _extname(filePath) === ".gz"
      ? gunzip(readFile(filePath), "utf8")
      : readFile(filePath, "utf8")
  }

  function tryCompile(manager, code, options) {
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
    const exported = new NullObject
    setSourceType(exported, "script")
    Runtime.enable(mod, exported, options)

    content =
      "const " + runtimeAlias + "=this;" + runtimeAlias +
      ".r((function(exports,require,module,__filename,__dirname){" +
      content + "\n}))"

    tryModuleCompile.call(this, manager, func, mod, content, filePath, options)
  }

  function tryESMCompile(manager, func, mod, content, filePath, runtimeAlias, options) {
    const exported = new NullObject
    setSourceType(exported, "module")

    if (options.cjs) {
      setProperty(exported, "__esModule", trueDescriptor)
    }

    Runtime.enable(mod, exported, options)

    let async = ""

    if (allowTopLevelAwait && options.await) {
      allowTopLevelAwait = false
      if (process.mainModule === mod ||
          process.mainModule.children.some((child) => child === mod)) {
        async = "async "
      }
    }

    content =
      (options.cjs ? '"use strict";const ' + runtimeAlias + "=this;" : "") +
      runtimeAlias + ".r((" + async + "function(){" + content + "\n}))"

    const moduleWrap = Module.wrap

    const customWrap = (script) => {
      Module.wrap = moduleWrap
      return '"use strict";(function(){const ' + runtimeAlias + "=this;" + script + "\n})"
    }

    if (! options.cjs) {
      Module.wrap = customWrap
    }

    try {
      tryModuleCompile.call(this, manager, func, mod, content, filePath, options)
    } finally {
      if (Module.wrap === customWrap) {
        Module.wrap = moduleWrap
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
      if (compilePath === filePath && ! restored) {
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
          if (! isParseError(e)) {
            maskStackTrace(e, () => readCode(filePath, options))
          }

          throw e
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

  const exts = [".js", ".gz", ".js.gz", ".mjs.gz", ".mjs"]

  exts.forEach((key) => {
    if (typeof _extensions[key] !== "function") {
      // Mimic the built-in behavior for ".mjs" and unrecognized extensions.
      if (key === ".gz") {
        _extensions[key] = gzCompiler
      } else if (key === ".mjs" || key === ".mjs.gz") {
        _extensions[key] = mjsCompiler
      } else if (key !== ".js") {
        _extensions[key] = jsCompiler
      }
    }

    const extCompiler = Wrapper.unwrap(_extensions, key)
    let passthru = ! extCompiler[mjsSym]

    if (passthru &&
        key === ".mjs") {
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

    Wrapper.manage(_extensions, key, managerWrapper)
    Wrapper.wrap(_extensions, key, methodWrapper)
  })

  moduleState.extensions[".js"] = _extensions[".js"]
}

function gzCompiler(mod, filePath) {
  let ext = extname(filePath)

  if (ext === ".gz" || typeof this[ext] !== "function") {
    ext = ".js"
  }

  const extCompiler = Wrapper.unwrap(this, ext)
  return extCompiler.call(this, mod, filePath)
}

function mjsCompiler(mod, filePath) {
  throw new errors.Error("ERR_REQUIRE_ESM", filePath)
}

setProperty(mjsCompiler, mjsSym, trueDescriptor)

export default hook
