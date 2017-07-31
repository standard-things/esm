import Entry from "./entry.js"
import FastObject from "./fast-object.js"
import Module from "module"
import URL from "url"
import Wrapper from "./wrapper.js"

import assign from "./util/assign.js"
import createOptions from "./util/create-options.js"
import path from "path"

const builtinModules = Object
  .keys(process.binding("natives"))
  .filter((key) => ! key.startsWith("internal/"))
  .reduce((object, key) => {
    object[key] = true
    return object
  }, Object.create(null))

const codeOfDot = ".".charCodeAt(0)
const codeOfForwardSlash = "/".charCodeAt(0)
const nodeModulePaths = Module._nodeModulePaths
const resolveCache = new FastObject
const resolveFilename = Module._resolveFilename
const urlCharsRegExp = /[:?#%]/

class Runtime {
  static enable(mod, exported, options) {
    options = createOptions(options)
    const object = mod.exports

    object.entry = Entry.get(mod, exported, options)
    object.module = mod
    object.options = options

    object.d = object.default = Rp.default
    object.e = object.export = Rp.export
    object.i = object.import = Rp.import
    object.n = object.nsSetter = Rp.nsSetter
    object.r = object.run = Rp.run
    object.u = object.update = Rp.update
    object.w = object.watch = Rp.watch
  }

  // Register a getter function that always returns the given value.
  default(value) {
    return this.export([["default", () => value]])
  }

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterPairs) {
    this.entry.addGetters(getterPairs)
  }

  import(id) {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          this.watch(id, [["*", resolve]])
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  nsSetter() {
    return (childNamespace, childEntry) => this.entry.addGettersFrom(childEntry)
  }

  run(moduleWrapper, req) {
    const mod = this.module
    const entry = this.entry
    const exported = mod.exports = entry.exports
    const options = this.options

    if (! moduleWrapper.length) {
      moduleWrapper.call(options.cjs ? exported : void 0)
      mod.loaded = true
      entry.update().loaded()
      assign(exported, entry._namespace)
      return
    }

    let wrappedRequire = req

    if (! options.cjs) {
      wrappedRequire = (id) => requireWrapper.call(this, req, id)
      assign(wrappedRequire, req)
    }

    const filename = mod.filename
    const dirname = path.dirname(filename)

    moduleWrapper.call(exported, exported, wrappedRequire, mod, filename, dirname)
    mod.loaded = true
  }

  // Platform-specific code should find a way to call this method whenever
  // the module system is about to return module.exports from require. This
  // might happen more than once per module, in case of dependency cycles,
  // so we want entry.update() to run each time.
  update(valueToPassThrough) {
    this.entry.update()

    // Returns the valueToPassThrough parameter to allow the value of the
    // original expression to pass through. For example,
    //
    //   export let a = 1
    //   console.log(a += 3)
    //
    // becomes
    //
    //   runtime.export("a", () => a)
    //   let a = 1
    //   console.log(runtime.update(a += 3))
    //
    // This ensures entry.update() runs immediately after the assignment,
    // and does not interfere with the larger computation.
    return valueToPassThrough
  }

  watch(id, setterPairs) {
    let childModule
    const parent = this.module

    if (id in builtinModules) {
      childModule = builtinModules[id]
      if (childModule === true) {
        childModule = builtinModules[id] = new Module(id, null)
        childModule.exports = parent.require(id)
        childModule.loaded = true
      }
    } else {
      id = resolveId(id, parent)
      parent.require(id)
      childModule = Module._cache[resolveFilename(id, parent)]
    }

    const childEntry = Entry.get(childModule)
    this.entry.children[id] = childEntry

    if (setterPairs !== void 0) {
      childEntry.addSetters(setterPairs, parent).update()
    }
  }
}

function isPath(id) {
  const code0 = id.charCodeAt(0)
  const code1 = id.charCodeAt(1)
  return code0 === codeOfForwardSlash || (code0 === codeOfDot &&
    (code1 === codeOfForwardSlash ||
    (code1 === codeOfDot && id.charCodeAt(2) === codeOfForwardSlash)))
}

function requireWrapper(func, id) {
  if (id in builtinModules) {
    return func(id)
  }

  const parent = this.module
  const filePath = resolveFilename(id, parent)

  if (filePath in Module._cache) {
    return func(id)
  }

  const childModule = new Module(filePath, parent)
  childModule.filename = filePath
  childModule.paths = nodeModulePaths(path.dirname(filePath))

  let ext = path.extname(filePath)

  if (! ext || typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  const compiler = Wrapper.unwrap(Module._extensions, ext)

  let threw = true

  try {
    Module._cache[filePath] = childModule
    compiler.call(Module._extensions, childModule, filePath)
    childModule.loaded = true
    threw = false
  } finally {
    if (threw) {
      delete Module._cache[filePath]
    }
  }

  return childModule.exports
}

function resolveId(id, parent) {
  if (! id ||
      typeof id !== "string" ||
      id in builtinModules ||
      (! urlCharsRegExp.test(id) && isPath(id))) {
    return id
  }

  const filename = parent.filename === null ? "." : parent.filename
  const cacheKey = id + "\0" + filename

  if (cacheKey in resolveCache) {
    return resolveCache[cacheKey]
  }

  const parsed = URL.parse(id)

  if (typeof parsed.pathname === "string") {
    id = unescape(parsed.pathname)
  }

  if (typeof parsed.protocol !== "string") {
    // Prevent resolving non-local dependencies:
    // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
    const paths = nodeModulePaths(path.dirname(filename))

    // Overwrite concat() to prevent global paths from being concatenated.
    paths.concat = () => paths

    // Ensure a parent id and filename are provided to avoid going down the
    // --eval branch of Module._resolveLookupPaths().
    return resolveCache[cacheKey] = resolveFilename(id, { filename, id: "<mock>", paths })
  }

  if (! parsed.pathname ||
      parsed.protocol !== "file:") {
    const error = new Error("Cannot find module '" + id + "'")
    error.code = "MODULE_NOT_FOUND"
    throw error
  }

  // Based on file-uri-to-path.
  // Copyright Nathan Rajlich. Released under MIT license:
  // https://github.com/TooTallNate/file-uri-to-path
  let host = parsed.host
  let pathname = id
  let prefix = ""

  // Section 2: Syntax
  // https://tools.ietf.org/html/rfc8089#section-2
  if (host === "localhost") {
    host = ""
  } else if (host) {
    prefix += path.sep + path.sep
  } else if (pathname.startsWith("//")) {
    // Windows shares have a pathname starting with "//".
    prefix += path.sep
  }

  // Section E.2: DOS and Windows Drive Letters
  // https://tools.ietf.org/html/rfc8089#appendix-E.2
  // https://tools.ietf.org/html/rfc8089#appendix-E.2.2
  pathname = path.normalize(pathname.replace(/^\/([a-zA-Z])[:|]/, "$1:"))

  return resolveCache[cacheKey] = resolveFilename(prefix + host + pathname, parent)
}

const Rp = Object.setPrototypeOf(Runtime.prototype, null)

Rp.d = Rp.default
Rp.e = Rp.export
Rp.i = Rp.import
Rp.n = Rp.nsSetter
Rp.r = Rp.run
Rp.u = Rp.update
Rp.w = Rp.watch

export default Runtime
