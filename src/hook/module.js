import { extname, resolve } from "path"

import Compiler from "../caching-compiler.js"
import Entry from "../entry.js"
import Module from "../module.js"
import Package from "../package.js"
import SafeMap from "../safe-map.js"
import Wrapper from "../wrapper.js"

import assign from "../util/assign.js"
import compile from "../module/_compile.js"
import encodeId from "../util/encode-id.js"
import errors from "../errors.js"
import getCacheFileName from "../util/get-cache-file-name.js"
import getCacheStateHash from "../util/get-cache-state-hash.js"
import getEnvVars from "../env/get-vars.js"
import gunzip from "../fs/gunzip.js"
import has from "../util/has.js"
import isError from "../util/is-error.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import moduleState from "../module/state.js"
import mtime from "../fs/mtime.js"
import readFile from "../fs/read-file.js"
import readFileFast from "../fs/read-file-fast.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"
import { name as stdName } from "../version.js"
import toOptInError from "../util/to-opt-in-error.js"

const { setPrototypeOf } = Object

const exts = [".js", ".mjs", ".gz", ".js.gz", ".mjs.gz"]
const importExportRegExp = /\b(?:im|ex)port\b/

const compileSym = Symbol.for("@std/esm:module._compile")
const mjsSym = Symbol.for('@std/esm:Module._extensions[".mjs"]')

function hook(Mod, parent) {
  const { _extensions } = Mod
  const passthruMap = new SafeMap

  const defaultPkg = new Package("", "*", { cache: false })
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

  if (defaultOptions.esm === "all") {
    defaultOptions.esm = "js"
  }

  defaultPkg.options = defaultOptions
  defaultPkg.range = "*"

  Module._extensions = _extensions
  shared.package.default = defaultPkg

  function managerWrapper(manager, func, args) {
    const [, filename] = args
    const pkg = Package.from(filename)
    const wrapped = Wrapper.find(_extensions, ".js", pkg.range)

    return wrapped
      ? wrapped.call(this, manager, func, args)
      : tryPassthru.call(this, func, args, pkg)
  }

  function methodWrapper(manager, func, args) {
    const [mod, filename] = args
    const { _compile } = mod
    const shouldOverwrite = ! Entry.has(mod)
    const shouldRestore = shouldOverwrite && has(mod, "_compile")
    const entry = Entry.get(mod)
    const pkg = entry.package
    const { cache, cachePath, options } = pkg
    const cacheName = getCacheFileName(entry, mtime(filename))

    const compileWrapper = (content, filename) => {
      if (shouldOverwrite) {
        if (shouldRestore) {
          mod._compile = _compile
        } else {
          delete mod._compile
        }
      }

      if (! compile(manager, entry, content, filename)) {
        entry.state = 3
        return tryPassthru.call(this, func, args, pkg)
      }
    }

    entry.cacheName = cacheName
    entry.runtimeName = encodeId("_" + getCacheStateHash(cacheName).slice(0, 3))

    setPrototypeOf(mod, Module.prototype)

    let cached = cache.compile[cacheName]

    if (cached === true) {
      cached = Compiler.from(entry)

      if (cached) {
        cached.code = readCachedCode(resolve(cachePath, cacheName), options)
        cache.compile[cacheName] = cached
      } else {
        delete cache.compile[cacheName]
        delete cache.map[cacheName]
      }
    }

    if (shouldOverwrite) {
      mod._compile = compileWrapper
    } else {
      setProperty(mod, compileSym, { enumerable: false, value: compileWrapper })
    }

    if (! cached &&
        passthruMap.get(func)) {
      tryPassthru.call(this, func, args, pkg)
    } else {
      const content = cached ? cached.code : readSourceCode(filename, options)
      mod._compile(content, filename)
    }
  }

  exts.forEach((ext) => {
    if (typeof _extensions[ext] !== "function" &&
        (ext === ".mjs" ||
         ext === ".mjs.gz")) {
      _extensions[ext] = mjsCompiler
    }

    const extCompiler = Wrapper.unwrap(_extensions, ext)

    let passthru =
      typeof extCompiler === "function" &&
      ! extCompiler[mjsSym]

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

function mjsCompiler(mod, filename) {
  const error = new errors.Error("ERR_REQUIRE_ESM", mod)
  const { mainModule } = moduleState

  if (mainModule &&
      mainModule.filename === filename) {
    toOptInError(error)
  }

  throw error
}

function readCachedCode(filename, options) {
  if (options && options.gz &&
      extname(filename) === ".gz") {
    return gunzip(readFile(filename), "utf8")
  }

  return readFileFast(filename, "utf8")
}

function readSourceCode(filename, options) {
  if (options && options.gz &&
      extname(filename) === ".gz") {
    return gunzip(readFile(filename), "utf8")
  }

  return readFile(filename, "utf8")
}

function tryPassthru(func, args, pkg) {
  const options = pkg && pkg.options

  if (options && options.debug) {
    func.apply(this, args)
  } else {
    try {
      func.apply(this, args)
    } catch (e) {
      if (isStackTraceMasked(e)) {
        throw e
      }

      const [, filename] = args
      const content = () => readSourceCode(filename, options)
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

setProperty(mjsCompiler, mjsSym, {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
})

export default hook
