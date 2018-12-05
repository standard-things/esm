import { extname, sep } from "../safe/path.js"

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
import setGetter from "../util/set-getter.js"
import setPrototypeOf from "../util/set-prototype-of.js"
import shared from "../shared.js"

const {
  STATE_EXECUTION_COMPLETED,
  STATE_EXECUTION_STARTED,
  TYPE_WASM
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

// The encoding of a WASM module starts with a 4-byte magic cookie.
// https://webassembly.github.io/spec/core/binary/modules.html#binary-module
const WASM_MAGIC_COOKIE = "\0asm"

const exts = [".js", ".mjs", ".wasm"]
const importExportRegExp = /^.*?\b(?:im|ex)port\b/
const realExtsJS = RealModule._extensions[".js"]

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

  Loader.state.package.default = defaultPkg
  Module._extensions = _extensions

  const jsManager = createManager(".js")
  const wasmManager = createManager(".wasm")

  function createManager(ext) {
    return function managerWrapper(manager, func, args) {
      const [, filename] = args
      const pkg = Package.from(filename)
      const wrapped = Wrapper.find(_extensions, ext, relaxRange(pkg.range))

      return wrapped
        ? Reflect.apply(wrapped, this, [manager, func, args])
        : tryPassthru.call(this, func, args, pkg)
    }
  }

  function jsWrapper(manager, func, args) {
    const [mod, filename] = args
    const exported = mod.exports

    const shouldOverwrite = ! Entry.has(isObjectLike(exported) ? exported : mod)
    const shouldRestore = shouldOverwrite && has(mod, "_compile")

    const entry = Entry.get(mod)
    const pkg = entry.package

    const compileFallback = () => {
      entry.state = STATE_EXECUTION_STARTED
      tryPassthru.call(this, func, args, pkg)
      entry.state = STATE_EXECUTION_COMPLETED
    }

    if (entry._passthru ||
        (shouldOverwrite &&
         entry.extname === ".mjs")) {
      entry._passthru = false
      compileFallback()
      return
    }

    const { cache, cachePath } = pkg
    const { _compile } = mod

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

  function wasmWrapper(manager, func, args) {
    const [mod, filename] = args
    const pkg = Entry.get(mod).package

    return pkg.options.wasm
      ? wasmCompiler(mod, filename)
      : tryPassthru.call(this, func, args, pkg)
  }

  for (const ext of exts) {
    const extIsWASM = ext === ".wasm"

    if (extIsWASM) {
      if (! shared.support.wasm) {
        continue
      }

      if (! Reflect.has(_extensions, ext)) {
        _extensions[ext] = realExtsJS
      }
    }

    const extIsMJS = ext === ".mjs"

    if (extIsMJS &&
        ! Reflect.has(_extensions, ext)) {
      _extensions[ext] = maskFunction(mjsCompiler, realExtsJS)
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

    const manager = extIsWASM ? wasmManager : jsManager
    const wrapper = extIsWASM ? wasmWrapper : jsWrapper

    Wrapper.manage(_extensions, ext, manager)
    Wrapper.wrap(_extensions, ext, wrapper)

    passthruMap.set(extCompiler, passthru)
    Loader.state.module.extensions[ext] = _extensions[ext]
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

  if (Loader.state.package.default.options.debug ||
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

  const content = () => {
    let possibleContent = null

    if (typeof filename === "string" &&
        extname(filename) !== ".wasm") {
      possibleContent = readFile(filename, "utf8")
    }

    if (typeof possibleContent === "string" &&
        ! possibleContent.startsWith(WASM_MAGIC_COOKIE)) {
      return possibleContent
    }

    return null
  }

  throw maskStackTrace(error, content, filename)
}

function wasmCompiler(mod, filename) {
  const {
    Instance:wasmInstance,
    Module:wasmModule
  } = WebAssembly

  const entry = Entry.get(mod)
  const imported = { __proto__: null }

  const wasmMod = new wasmModule(readFile(filename))
  const descriptions = wasmModule.imports(wasmMod)

  for (const description of descriptions) {
    const request = description.module

    imported[request] = esmLoad(request, null).module.exports
  }

  const exported = { __proto__: null }
  const readonlyExports = new wasmInstance(wasmMod, imported).exports

  for (const name in readonlyExports) {
    setGetter(exported, name, () => readonlyExports[name])
  }

  Entry.delete(mod.exports, entry)
  Entry.set(exported, entry)

  entry.type = TYPE_WASM

  entry.exports =
  mod.exports = exported
}

Reflect.defineProperty(mjsCompiler, shared.symbol.mjs, {
  value: true
})

export default hook
