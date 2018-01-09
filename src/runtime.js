import Entry from "./entry.js"
import NullObject from "./null-object.js"

import _loadCJS from "./module/cjs/_load.js"
import _loadESM from "./module/esm/_load.js"
import builtinEntries from "./builtin-entries.js"
import errors from "./errors.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import moduleState from "./module/state.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"
import shared from "./shared.js"

class Runtime {
  static enable(entry, exported) {
    const mod = entry.module
    const object = mod.exports
    const { prototype } = Runtime

    object.entry = entry
    entry.exports = exported

    Entry.set(mod, exported, entry)

    setGetter(object, "meta", () => {
      const meta = new NullObject
      meta.url = entry.url
      return object.meta = meta
    })

    setSetter(object, "meta", (value) => {
      setProperty(object, "meta", { value })
    })

    object._ = object
    object.d = object.default = prototype.default
    object.e = object.export = prototype.export
    object.i = object.import = prototype.import
    object.n = object.nsSetter = prototype.nsSetter
    object.r = object.run = prototype.run
    object.u = object.update = prototype.update
    object.w = object.watch = prototype.watch
  }

  // Register a getter function that always returns the given value.
  default(value) {
    this.export([["default", () => value]])
  }

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterPairs) {
    this.entry.addGetters(getterPairs)
  }

  import(request) {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          watch(this.entry, request, [["*", createSetter("import", (value, childEntry) => {
            if (childEntry._loaded === 1) {
              resolve(value)
            }
          })]], loadESM)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  nsSetter() {
    return createSetter("nsSetter", (value, childEntry) => {
      this.entry.addGettersFrom(childEntry)
    })
  }

  run(moduleWrapper) {
    const { entry } = this
    const runner = entry.esm ? runESM : runCJS
    runner(entry, moduleWrapper)
  }

  update(valueToPassThrough) {
    this.entry.update()

    // Returns the `valueToPassThrough` parameter to allow the value of the
    // original expression to pass through. For example,
    //
    //   export let a = 1
    //   a += 3
    //
    // becomes
    //
    //   runtime.export("a", () => a)
    //   let a = 1
    //   runtime.update(a += 3)
    //
    // This ensures `entry.update()` runs immediately after the assignment,
    // and does not interfere with the larger computation.
    return valueToPassThrough
  }

  watch(request, setterPairs) {
    return watch(this.entry, request, setterPairs, _loadESM)
  }
}

function createSetter(from, setter) {
  setter.from = from
  return setter
}

function load(request, parent, loader, preload) {
  if (request in builtinEntries) {
    const entry = builtinEntries[request]

    if (preload) {
      preload(entry)
    }

    return entry
  }

  return loader(request, parent, false, preload)
}

function runCJS(entry, moduleWrapper) {
  const { module:mod, options } = entry
  const exported = mod.exports = entry.exports
  const loader = options.cjs.vars ? loadESM : _loadCJS
  const req = makeRequireFunction(mod, (request) => {
    const childEntry = load(request, mod, loader)
    const child = childEntry.module

    if (! options.cjs.vars &&
        childEntry.esm) {
      throw new errors.Error("ERR_REQUIRE_ESM", child)
    }

    return child.exports
  })

  moduleWrapper.call(exported, shared.global, exported, req)
  mod.loaded = true
}

function runESM(entry, moduleWrapper) {
  const { module:mod, options } = entry
  const exported = mod.exports = entry.exports

  if (options.cjs.vars) {
    const requirer = (request) => load(request, mod, loadESM).module.exports
    const req = makeRequireFunction(mod, requirer)

    moduleWrapper.call(exported, shared.global, exported, req)
  } else {
    moduleWrapper.call(void 0, shared.global)
  }

  mod.loaded = true
  entry.update().loaded()
}

function watch(entry, request, setterPairs, loader) {
  moduleState.requireDepth += 1

  try {
    const childEntry = load(request, entry.module, loader, (childEntry) => {
      entry.children[childEntry.id] = childEntry
      childEntry.addSetters(setterPairs, entry)
    })

    childEntry.loaded()
    childEntry.update()
  } finally {
    moduleState.requireDepth -= 1
  }
}

Object.setPrototypeOf(Runtime.prototype, null)

export default Runtime
