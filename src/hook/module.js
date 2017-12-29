import { extname as _extname, dirname, resolve } from "path"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import FastObject from "../fast-object.js"
import Module from "../module.js"
import NullObject from "../null-object.js"
import PkgInfo from "../pkg-info.js"
import Runtime from "../runtime.js"
import SafeMap from "../safe-map.js"
import Wrapper from "../wrapper.js"

import _loadESM from "../module/esm/_load.js"
import assign from "../util/assign.js"
import builtinModules from "../builtin-modules.js"
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
import getModuleName from "../util/get-module-name.js"
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
import setESM from "../util/set-es-module.js"
import setProperty from "../util/set-property.js"
import stat from "../fs/stat.js"
import toOptInError from "../util/to-opt-in-error.js"
import toStringLiteral from "../util/to-string-literal.js"

const { keys, setPrototypeOf } = Object

const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]
const compileSym = Symbol.for("@std/esm:module._compile")
const mjsSym = Symbol.for('@std/esm:Module._extensions[".mjs"]')
const metaSym = Symbol.for("@std/esm:Module#meta")
const preloadSym = Symbol.for("@std/esm:Module#preload")

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

    if (wrapped) {
      return wrapped.call(this, manager, func, pkgInfo, args)
    }

    if (! moduleState.preload) {
      return tryPassthru.call(this, func, args, pkgInfo.options)
    }
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
        cached =
        cache[cacheFileName] = assign({
          changed: true,
          code
        }, Compiler.getMeta(code))
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

      if (! cached) {
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

      if (moduleState.preload &&
          cached.warnings) {
        for (const warning of cached.warnings) {
          emitWarning(warning + ": " + filePath)
        }
      }

      if (! cached.changed &&
          ! overwriteOptions &&
          pkgInfo === getDefaultPkgInfo()) {
        tryPassthru.call(this, func, args, options)
        return
      }

      const entry = Entry.get(mod)
      entry.runtimeName = runtimeName

      if (! entry.url) {
        entry.url = getURLFromFilePath(filePath)
      }

      if (! moduleState.preload) {
        tryCompileCached(mod, cached, filePath, runtimeName, options)
        return
      }

      mod[metaSym] = cached

      if (! cached.esm) {
        return
      }

      const { moduleSpecifiers } = cached
      const names = keys(moduleSpecifiers)
      const resolved = {}

      for (const name of names) {
        resolved[name] = name in builtinModules
          ? builtinModules[name]
          : _loadESM(name, mod)

        resolved[name][preloadSym] = true
      }

      for (const name of names) {
        const moduleSpecifier = resolved[name][metaSym]

        if (! moduleSpecifier || ! moduleSpecifier.esm) {
          continue
        }

        const requestedExportNames = moduleSpecifiers[name]

        for (const exportName of requestedExportNames) {
          const { exportSpecifiers } = moduleSpecifier

          if (exportSpecifiers[exportName] === "exportName") {
            raise("ERR_EXPORT_STAR_CONFLICT", mod, exportName)
          } else if (! (exportName in exportSpecifiers)) {
            let skipExportMissing = false

            for (const name of moduleSpecifier.exportStarNames) {
              const childCached = resolved[name] && resolved[name][metaSym]

              if (! childCached || ! childCached.esm) {
                skipExportMissing = true
                break
              }
            }

            if (! skipExportMissing &&
                exportName !== "*") {
              raise("ERR_EXPORT_MISSING", resolved[name], exportName)
            }
          }
        }
      }

      // Resolve export names.
      for (const name of cached.exportStarNames) {
        const childCached = resolved[name] && resolved[name][metaSym]

        if (! childCached || ! childCached.exportSpecifiers) {
          continue
        }
        const childExportNames = keys(childCached.exportSpecifiers)

        for (const exportName of childExportNames) {
          const { exportSpecifiers } = cached

          if (has(exportSpecifiers, exportName)) {
            if (exportSpecifiers[exportName] === "imported") {
              exportSpecifiers[exportName] = "conflicted"
            }
          } else {
            exportSpecifiers[exportName] = "imported"
          }
        }
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

  function tryCompileCJS(mod, content, filePath, runtimeName, options) {
    const async = useAsyncWrapper(mod, options) ? "async " :  ""

    content =
      "const " + runtimeName + "=this;" +
      runtimeName + ".r((" + async + "function(exports,require){" + content + "\n}))"

    content +=
      maybeSourceMap(content, filePath, options)

    const exported = {}

    setESM(exported, false)
    Runtime.enable(mod, exported, options)
    mod._compile(content, filePath)
  }

  function tryCompileESM(mod, content, filePath, runtimeName, options) {
    const async = useAsyncWrapper(mod, options) ? "async " :  ""

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

  function useAsyncWrapper(mod, options) {
    const { mainModule } = moduleState

    if (allowTopLevelAwait &&
        mainModule &&
        options.await) {
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

function maybeSourceMap(content, filePath, options) {
  if (options.sourceMap !== false &&
      (env.inspector || options.sourceMap) &&
      ! getSourceMappingURL(content)) {
    return "//# sourceMappingURL=data:application/json;charset=utf-8," +
      encodeURI(createSourceMap(filePath, content))
  }

  return ""
}

function mjsCompiler(mod, filePath) {
  const error = new errors.Error("ERR_REQUIRE_ESM", filePath)
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

function tryCompileCode(manager, sourceCode, options) {
  const { filePath, pkgInfo } = options

  if (pkgInfo.options.debug) {
    return Compiler.compile(sourceCode, options)
  }

  try {
    return Compiler.compile(sourceCode, options)
  } catch (e) {
    const useURLs = e.sourceType === "module"

    delete e.sourceType
    captureStackTrace(e, manager)
    throw maskStackTrace(e, sourceCode, filePath, useURLs)
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

function exportMissing(mod, name) {
  const moduleName = getModuleName(mod)
  return "Module " + toStringLiteral(moduleName, "'") +
    " does not provide an export named '" + name + "'"
}

function exportStarConflict(mod, name) {
  const moduleName = getModuleName(mod)
  return "Module " + toStringLiteral(moduleName, "'") +
    " contains conflicting star exports for name '" + name + "'"
}

function raise(key, mod, name) {
  throw new SyntaxError(messages[key](mod, name))
}

const messages = new FastObject
messages["ERR_EXPORT_MISSING"] = exportMissing
messages["ERR_EXPORT_STAR_CONFLICT"] = exportStarConflict

