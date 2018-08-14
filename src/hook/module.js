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

import compile from "../module/internal/compile.js"
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import esmState from "../module/esm/state.js"
import getCacheName from "../util/get-cache-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getLocationFromStackTrace from "../error/get-location-from-stack-trace.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isObjectLike from "../util/is-object-like.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskFunction from "../util/mask-function.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import relaxRange from "../util/relax-range.js"
import toString from "../util/to-string.js"
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

  let parentPkg = Package.from(parent)

  if (! parentPkg) {
    parentPkg = Package.from(parent, true)

    if (OPTIONS) {
      parentPkg.options = Package.createOptions(OPTIONS)
    }
  }

  const defaultPkg = parentPkg.clone()
  const defaultOptions = defaultPkg.options

  defaultPkg.range = RANGE_ALL

  if (! defaultOptions.force &&
      defaultOptions.mode === OPTIONS_MODE_ALL) {
    defaultOptions.mode = OPTIONS_MODE_AUTO
  }

  Package.state.default = defaultPkg

  Module._extensions = _extensions

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
         entry.extname === ".mjs")) {
      entry._passthru = false
      tryPassthru.call(this, func, args, pkg)
      return
    }

    const { cache, cachePath } = pkg
    const { _compile } = mod

    let { cacheName } = entry

    if (! cacheName) {
      cacheName =
      entry.cacheName = getCacheName(entry, mtime(filename))
    }

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
        cache.compile[cacheName] === null) {
      compileData = Compiler.from(entry)

      if (compileData) {
        compileData.code = readFileFast(cachePath + sep + cacheName, "utf8")
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
        : readFile(filename, "utf8")

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
    esmState.extensions[ext] = _extensions[ext]
  }
}

function mjsCompiler(mod, filename) {
  throw new ERR_REQUIRE_ESM(filename)
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
    const message = toString(error.message)
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

  const content = () => readFile(filename, "utf8")

  throw maskStackTrace(error, content, filename)
}

Reflect.defineProperty(mjsCompiler, shared.symbol.mjs, {
  value: true
})

export default hook
