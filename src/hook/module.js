import ENTRY from "../constant/entry.js"
import ENV from "../constant/env.js"
import ESM from "../constant/esm.js"
import PACKAGE from "../constant/package.js"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"
import RealModule from "../real/module.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import compile from "../module/_compile.js"
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import getCacheName from "../util/get-cache-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getLocationFromStackTrace from "../error/get-location-from-stack-trace.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isMJS from "../util/is-mjs.js"
import isObjectLike from "../util/is-object-like.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskFunction from "../util/mask-function.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import relaxRange from "../util/relax-range.js"
import safeToString from "../util/safe-to-string.js"
import satisfies from "../util/satisfies.js"
import { sep } from "../safe/path.js"
import shared from "../shared.js"

const {
  STATE_EXECUTION_STARTED
} = ENTRY

const {
  OPTIONS
} = ENV

const {
  PKG_VERSION
} = ESM

const {
  OPTIONS_MODE_ALL,
  OPTIONS_MODE_AUTO,
  RANGE_ALL
} = PACKAGE

const {
  ERR_REQUIRE_ESM
} = errors

const exts = [".js", ".mjs"]
const importExportRegExp = /^.*?\b(?:im|ex)port\b/
const sourceExtsJs = RealModule._extensions[".js"]
const sourceExtsMjs = RealModule._extensions[".mjs"] || sourceExtsJs

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

  if (! parent &&
      OPTIONS) {
    assign(defaultOptions, Package.createOptions(OPTIONS))
  }

  if (! parentPkg) {
    parentPkg = Package.from(parent, true)
    assign(parentPkg.options, defaultOptions)
    assign(defaultPkg, parentPkg)
  }

  if (defaultOptions.mode === OPTIONS_MODE_ALL) {
    defaultOptions.mode = OPTIONS_MODE_AUTO
  }

  defaultPkg.options = defaultOptions
  defaultPkg.range = RANGE_ALL

  Module._extensions = _extensions
  Package.state.default = defaultPkg

  function managerWrapper(manager, func, args) {
    const [, filename] = args
    const pkg = Package.from(filename)
    const wrapped = Wrapper.find(_extensions, ".js", relaxRange(pkg.range))

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

    if (entry._passthru ||
        (shouldOverwrite &&
         isMJS(mod))) {
      entry._passthru = false
      tryPassthru.call(this, func, args, pkg)
      return
    }

    const { cache, cachePath } = pkg
    const cacheName = getCacheName(entry, mtime(filename))

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

    let { compileData } = entry

    if (! compileData &&
        cache.compile[cacheName] === true) {
      compileData = Compiler.from(entry)

      if (compileData) {
        compileData.code = readCachedCode(cachePath + sep + cacheName)
      } else {
        Reflect.deleteProperty(cache.compile, cacheName)
      }
    }

    if (shouldOverwrite) {
      mod._compile = compileWrapper
      Reflect.setPrototypeOf(mod, Module.prototype)
    } else {
      Reflect.defineProperty(mod, shared.symbol._compile, {
        configurable: true,
        value: compileWrapper
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
    const extIsMJS = ext === ".mjs"

    if (extIsMJS &&
        ! Reflect.has(_extensions, ext)) {
      _extensions[ext] = maskFunction(mjsCompiler, sourceExtsMjs)
    }

    const extCompiler = Wrapper.unwrap(_extensions, ext)

    let passthru =
      typeof extCompiler === "function" &&
      ! extCompiler[shared.symbol.mjs]

    if (passthru &&
        extIsMJS) {
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
  throw new ERR_REQUIRE_ESM(filename)
}

function readCachedCode(filename) {
  return readFileFast(filename, "utf8")
}

function readSourceCode(filename) {
  return readFile(filename, "utf8")
}

function tryPassthru(func, args, pkg) {
  let error

  try {
    return Reflect.apply(func, this, args)
  } catch (e) {
    error = e
  }

  if (Package.state.default.options.debug ||
      ! isError(error) ||
      isStackTraceMasked(error)) {
    throw error
  }

  let [, filename] = args

  if (error.name === "SyntaxError") {
    const message = safeToString(error.message)
    const { range } = pkg

    if (importExportRegExp.test(message) &&
        ! satisfies(PKG_VERSION, range)) {
      error.message =
        "Expected esm@" + range +
        ". Using esm@" + PKG_VERSION + ": " + filename

      error.stack = error.stack.replace(message, error.message)
    }

    if (pkg) {
      pkg.cache.dirty = true
    }
  }

  const loc = getLocationFromStackTrace(error)

  if (loc) {
    filename = loc.filename
  }

  const content = () => readSourceCode(filename)

  throw maskStackTrace(error, content, filename)
}

Reflect.defineProperty(mjsCompiler, shared.symbol.mjs, {
  value: true
})

export default hook
