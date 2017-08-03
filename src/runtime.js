import Entry from "./entry.js"
import Module from "module"
import Wrapper from "./wrapper.js"

import assign from "./util/assign.js"
import builtinModules from "./builtin-modules.js"
import createOptions from "./util/create-options.js"
import getSourceType from "./util/get-source-type.js"
import path from "path"
import resolveId from "./util/resolve-id.js"

const nodeModulePaths = Module._nodeModulePaths
const resolveFilename = Module._resolveFilename

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
  // the module system is about to return `module.exports` from `require`.
  // This might happen more than once per module, in case of dependency cycles,
  // so we want `entry.update()` to run each time.
  update(valueToPassThrough) {
    this.entry.update()

    // Returns the `valueToPassThrough` parameter to allow the value of the
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
    // This ensures `entry.update()` runs immediately after the assignment,
    // and does not interfere with the larger computation.
    return valueToPassThrough
  }

  watch(id, setterPairs) {
    let childModule
    const parent = this.module

    if (id in builtinModules) {
      childModule = builtinModules[id]
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

function requireWrapper(func, id) {
  if (id in builtinModules) {
    return func(id)
  }

  const parent = this.module
  const filePath = resolveFilename(id, parent)
  let ext = path.extname(filePath)

  if (! ext || typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  const compiler = Wrapper.unwrap(Module._extensions, ext)

  if (filePath in Module._cache) {
    const childModule = Module._cache[filePath]

    if (getSourceType(childModule.exports) !== "module") {
      return func(id)
    }

    tryParse(compiler, childModule, filePath)
    return childModule.exports
  }

  const childModule = new Module(filePath, parent)
  childModule.filename = filePath
  childModule.paths = nodeModulePaths(path.dirname(filePath))

  tryModuleLoad(compiler, childModule, filePath)
  return childModule.exports
}

function tryModuleLoad(compiler, mod, filePath) {
  let threw = true
  Module._cache[filePath] = mod

  try {
    compiler.call(Module._extensions, mod, filePath)
    mod.loaded = true
    threw = false
  } finally {
    if (threw) {
      delete Module._cache[filePath]
    }
  }
}

function tryParse(compiler, mod, filePath) {
  const moduleWrap = Module.wrap
  const customWrap = (script) => {
    Module.wrap = moduleWrap
    return "(function(){" + script + "\n});(function(){})"
  }

  // Change the module wrapper so that the module is parsed, but not executed.
  Module.wrap = customWrap

  try {
    compiler.call(Module._extensions, mod, filePath)
  } finally {
    if (Module.wrap === customWrap) {
      Module.wrap = moduleWrap
    }
  }
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
