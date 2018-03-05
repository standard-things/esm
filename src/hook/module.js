import ENTRY from "../constant/entry.js"
import PACKAGE from "../constant/package.js"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import compile from "../module/_compile.js"
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getEnvVars from "../env/get-vars.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isObjectLike from "../util/is-object-like.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskFunction from "../util/mask-function.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import { resolve } from "path"
import shared from "../shared.js"
import { name as stdName } from "../version.js"
import toOptInError from "../util/to-opt-in-error.js"

const {
  STATE_EXECUTION_STARTED
} = ENTRY

const {
  OPTIONS_MODE_ALL,
  OPTIONS_MODE_JS,
  RANGE_ALL
} = PACKAGE

const {
  ERR_REQUIRE_ESM
} = errors

const BuiltinModule = __non_webpack_module__.constructor

const exts = [".js", ".mjs"]
const importExportRegExp = /\b(?:im|ex)port\b/
const sourceExtsJs = BuiltinModule._extensions[".js"]
const sourceExtsMjs = BuiltinModule._extensions[".mjs"] || sourceExtsJs

function hook(Mod, parent) {
  const { _extensions } = Mod
  const passthruMap = new Map

  const defaultPkg = new Package("", RANGE_ALL, { cache: false })
  const defaultOptions = defaultPkg.options
  let parentPkg = Package.from(parent)

  if (parentPkg) {
    assign(defaultPkg, parentPkg)
    assign(defaultOptions, parentPkg.options)
  }

  if (! parent) {
    const { ESM_OPTIONS } = getEnvVars()

    if (ESM_OPTIONS) {
      assign(defaultOptions, Package.createOptions(ESM_OPTIONS))
    }
  }

  if (! parentPkg) {
    parentPkg = Package.from(parent, true)
    assign(parentPkg.options, defaultOptions)
    assign(defaultPkg, parentPkg)
  }

  if (defaultOptions.mode === OPTIONS_MODE_ALL) {
    defaultOptions.mode = OPTIONS_MODE_JS
  }

  defaultPkg.options = defaultOptions
  defaultPkg.range = RANGE_ALL

  Module._extensions = _extensions
  shared.package.default = defaultPkg

  function managerWrapper(manager, func, args) {
    const [, filename] = args
    const pkg = Package.from(filename)
    const wrapped = Wrapper.find(_extensions, ".js", pkg.range)

    return wrapped
      ? Reflect.apply(wrapped, this, [manager, func, args])
      : tryPassthru.call(this, func, args, pkg)
  }

  function methodWrapper(manager, func, args) {
    const [mod, filename] = args
    const exported = mod.exports

    const shouldOverwrite = ! Entry.has(isObjectLike(exported) ? exported : mod)
    const shouldRestore = shouldOverwrite && has(mod, "_compile")

    const entry = Entry.get(mod)
    const pkg = entry.package
    const { cache, cachePath } = pkg
    const cacheName = getCacheFileName(entry, mtime(filename))

    const { _compile } = mod

    const compileFallback = () => {
      entry.state = STATE_EXECUTION_STARTED
      return tryPassthru.call(this, func, args, pkg)
    }

    const compileWrapper = (content, filename) => {
      if (shouldOverwrite) {
        if (shouldRestore) {
          mod._compile = _compile
        } else {
          Reflect.deleteProperty(mod, "_compile")
        }
      }

      return compile(manager, entry, content, filename, compileFallback)
    }

    entry.cacheName = cacheName
    entry.runtimeName = encodeId("_" + getCacheStateHash(cacheName).slice(0, 3))

    Reflect.setPrototypeOf(mod, Module.prototype)

    let { compileData } = entry

    if (cache.compile[cacheName] === true) {
      compileData = Compiler.from(entry)

      if (compileData) {
        compileData.code = readCachedCode(resolve(cachePath, cacheName))
      } else {
        Reflect.deleteProperty(cache.compile, cacheName)
        Reflect.deleteProperty(cache.map, cacheName)
      }
    }

    if (shouldOverwrite) {
      mod._compile = compileWrapper
    } else {
      Reflect.defineProperty(mod, shared.symbol._compile, {
        __proto__: null,
        configurable: true,
        value: compileWrapper,
        writable: true
      })
    }

    if (! compileData &&
        passthruMap.get(func)) {
      tryPassthru.call(this, func, args, pkg)
    } else {
      const content = compileData
        ? compileData.code
        : readSourceCode(filename)

      mod._compile(content, filename)
    }
  }

  for (const ext of exts) {
    if (ext === ".mjs" &&
        typeof _extensions[ext] !== "function") {
      _extensions[ext] = maskFunction(mjsCompiler, sourceExtsMjs)
    }

    const extCompiler = Wrapper.unwrap(_extensions, ext)

    let passthru =
      typeof extCompiler === "function" &&
      ! extCompiler[shared.symbol.mjs]

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
  }
}

function mjsCompiler(mod, filename) {
  const error = new ERR_REQUIRE_ESM(mod)
  const { mainModule } = moduleState

  if (mainModule &&
      mainModule.filename === filename) {
    toOptInError(error)
  }

  throw error
}

function readCachedCode(filename) {
  return readFileFast(filename, "utf8")
}

function readSourceCode(filename) {
  return readFile(filename, "utf8")
}

function tryPassthru(func, args, pkg) {
  const options = pkg && pkg.options

  if (options && options.debug) {
    Reflect.apply(func, this, args)
  } else {
    try {
      Reflect.apply(func, this, args)
    } catch (e) {
      if (! isError(e) ||
          isStackTraceMasked(e)) {
        throw e
      }

      const [, filename] = args
      const content = () => readSourceCode(filename)
      const { message } = e

      if (e.name === "SyntaxError" &&
          importExportRegExp.test(message)) {
        e.message = stdName + " is not enabled for " + filename
        e.stack = e.stack.replace(message, e.message)

        if (pkg) {
          pkg.cache.dirty = true
        }
      }

      throw maskStackTrace(e, content, filename)
    }
  }
}

Reflect.defineProperty(mjsCompiler, shared.symbol.mjs, {
  __proto__: null,
  value: true
})

export default hook
