import Module, { _nodeModulePaths, _resolveFilename } from "module"
import { dirname, extname } from "path"

import Entry from "./entry.js"
import Wrapper from "./wrapper.js"

import assign from "./util/assign.js"
import builtinModules from "./builtin-modules.js"
import createOptions from "./util/create-options.js"
import getSourceType from "./util/get-source-type.js"
import isObjectLike from "./util/is-object-like.js"
import resolveId from "./util/resolve-id.js"
import setGetter from "./util/set-getter.js"

const queryHashRegExp = /[?#].*$/

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
    const { entry } = this
    const exported = mod.exports = entry.exports
    const { options } = this

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

    const __filename = mod.filename
    const __dirname = dirname(__filename)

    moduleWrapper.call(exported, exported, wrappedRequire, mod, __filename, __dirname)
    mod.loaded = true

    if (! isObjectLike(mod.exports)) {
      return
    }

    const newEntry = Entry.get(mod, mod.exports, options)
    newEntry.sourceType = getSourceType(newEntry.exports)
    newEntry.update().loaded()

    Entry.set(mod.exports, entry.merge(newEntry))
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
    let cacheId
    let child
    let oldChild
    let resId

    const { entry } = this
    const { children, options } = entry
    const parent = this.module

    if (id in builtinModules) {
      cacheId = id
      child = builtinModules[cacheId]
    } else {
      resId = resolveId(id, parent, options)

      if (resId !== id) {
        // Each id with a query+hash is given a new cache entry.
        const queryHash = queryHashRegExp.exec(id)

        if (queryHash !== null) {
          cacheId = resId + queryHash[0]

          if (cacheId in Module._cache) {
            child = Module._cache[cacheId]
          } else if (resId in Module._cache) {
            // Backup the existing `resId` module. The child module will be stored
            // at `resId` because Node sees the file path without query+hash.
            oldChild = Module._cache[resId]
            delete Module._cache[resId]
          }
        }
      }
    }

    if (! child) {
      let error

      try {
        parent.require(resId)
      } catch (e) {
        error = e
      }

      if (cacheId) {
        Module._cache[cacheId] = Module._cache[resId]

        if (oldChild) {
          Module._cache[resId] = oldChild
        } else {
          delete Module._cache[resId]
        }
      } else {
        cacheId = _resolveFilename(resId, parent)
      }

      if (error) {
        // Unlike CJS, ESM errors are preserved for subsequent loads.
        setGetter(Module._cache, cacheId, () => {
          throw error
        })

        throw error
      } else {
        child = Module._cache[cacheId]
      }
    }

    const childEntry = children[cacheId] = Entry.get(child)
    childEntry.loaded()

    if (setterPairs !== void 0) {
      childEntry.addSetters(setterPairs, Entry.get(parent)).update()
    }
  }
}

function requireWrapper(func, id) {
  if (id in builtinModules) {
    return func(id)
  }

  const parent = this.module
  const filePath = _resolveFilename(id, parent)
  let ext = extname(filePath)

  if (! ext || typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  const compiler = Wrapper.unwrap(Module._extensions, ext)

  if (filePath in Module._cache) {
    const childModule = Module._cache[filePath]

    if (getSourceType(childModule.exports) === "module") {
      tryParse(compiler, childModule, filePath)
      return childModule.exports
    }

    return func(id)
  }

  const childModule = new Module(filePath, parent)
  childModule.filename = filePath
  childModule.paths = _nodeModulePaths(dirname(filePath))

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
