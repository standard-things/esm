import ENTRY from "../constant/entry.js"
import ENV from "../constant/env.js"
import ESM from "../constant/esm.js"
import PACKAGE from "../constant/package.js"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Loader from "../loader.js"
import Module from "../module.js"
import Package from "../package.js"
import RealModule from "../real/module.js"
import Wrapper from "../wrapper.js"

import compile from "../module/internal/compile.js"
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import esmLoad from "../module/esm/load.js"
import get from "../util/get.js"
import getCacheName from "../util/get-cache-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getLocationFromStackTrace from "../error/get-location-from-stack-trace.js"
import getMtime from "../fs/get-mtime.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isObjectLike from "../util/is-object-like.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskFunction from "../util/mask-function.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import readFile from "../fs/read-file.js"
import relaxRange from "../util/relax-range.js"
import toString from "../util/to-string.js"
import satisfies from "../util/satisfies.js"
import set from "../util/set.js"
import setPrototypeOf from "../util/set-prototype-of.js"
import { sep } from "../safe/path.js"
import shared from "../shared.js"

const {
  STATE_EXECUTION_STARTED
} = ENTRY

const {
  OPTIONS
} = ENV

const {
  PACKAGE_VERSION
} = ESM

const {
  MODE_ALL,
  MODE_AUTO,
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

  if (parentPkg === null) {
    parentPkg = Package.from(parent, OPTIONS || true)
  }

  const defaultPkg = parentPkg.clone()
  const defaultOptions = defaultPkg.options

  defaultPkg.range = RANGE_ALL

  if (! defaultOptions.force &&
      defaultOptions.mode === MODE_ALL) {
    defaultOptions.mode = MODE_AUTO
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

    let { cacheName, mtime } = entry

    if (mtime === -1) {
      mtime =
      entry.mtime = getMtime(filename)
    }

    if (cacheName === null) {
      cacheName = getCacheName(mtime, {
        cachePath,
        filename,
        packageOptions: pkg.options
      })

      entry.cacheName = cacheName
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

    if (compileData === null &&
        cache.compile[cacheName] === null) {
      compileData = Compiler.from(entry)

      if (compileData === null) {
        Reflect.deleteProperty(cache.compile, cacheName)
      } else {
        compileData.code = readFile(cachePath + sep + cacheName, "utf8") || ""
      }
    }

    if (shouldOverwrite) {
      mod._compile = compileWrapper
      setPrototypeOf(mod, Module.prototype)
    } else {
      Reflect.defineProperty(mod, shared.symbol._compile, {
        configurable: true,
        value: compileWrapper
      })
    }

    if (compileData === null &&
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
      ! has(extCompiler, shared.symbol.mjs)

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
    Loader.state.module.extensions[ext] = _extensions[ext]
  }

  _extensions[".wasm"] =
  Loader.state.module.extensions[".wasm"] = wasmCompiler
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

  const name = get(error, "name")

  let [, filename] = args

  if (name === "SyntaxError") {
    const message = toString(get(error, "message"))
    const { range } = pkg

    if (importExportRegExp.test(message) &&
        ! satisfies(PACKAGE_VERSION, range)) {
      const newMessage =
        "Expected esm@" + range +
        ". Using esm@" + PACKAGE_VERSION + ": " + filename

      set(error, "message", newMessage)

      const stack = get(error, "stack")

      if (typeof stack === "string") {
        set(error, "stack", stack.replace(message, newMessage))
      }
    }

    pkg.cache.dirty = true
  }

  const loc = getLocationFromStackTrace(error)

  if (loc !== null) {
    filename = loc.filename
  }

  const content = () => readFile(filename, "utf8")

  throw maskStackTrace(error, content, filename)
}

function wasmCompiler(mod, filename) {
  const {
    Instance:wasmInstance,
    Module:wasmModule
  } = WebAssembly

  const wasmMod = new wasmModule(readFile(filename))

  const imported = wasmModule
    .imports(wasmMod)
    .reduce((object, specifier) => {
      const request = specifier.module

      object[request] = esmLoad(request, null).module.exports
      return object
    }, { __proto__: null })

  mod.exports = new wasmInstance(wasmMod, imported).exports
}

Reflect.defineProperty(mjsCompiler, shared.symbol.mjs, {
  value: true
})

export default hook
