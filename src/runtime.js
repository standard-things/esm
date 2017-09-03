
import Entry from "./entry.js"

import assign from "./util/assign.js"
import builtinEntries from "./builtin-entries.js"
import createOptions from "./util/create-options.js"
import { dirname } from "path"
import getSourceType from "./util/get-source-type.js"
import loadCJS from "./module/cjs/load.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import moduleState from "./module/state.js"

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
    if (moduleWrapper.length) {
      runCJS(this, moduleWrapper, req)
    } else {
      runESM(this, moduleWrapper)
    }
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
    const { entry } = this
    const parent = this.module

    moduleState.requireDepth += 1

    try {
      const childEntry = importModule(id, entry)
      if (setterPairs !== void 0) {
        childEntry.addSetters(setterPairs, Entry.get(parent)).update()
      }
    } finally {
      moduleState.requireDepth -= 1
    }
  }
}

function importModule(id, parentEntry) {
  if (id in builtinEntries) {
    return builtinEntries[id]
  }

  const { module:parent, options } = parentEntry
  const child = loadESM(id, parent, options)
  const childEntry = Entry.get(child)

  childEntry.loaded()

  if (childEntry.sourceType === "module") {
    delete __non_webpack_require__.cache[child.id]
  } else {
    delete moduleState.cache[child.id]
  }

  return parentEntry.children[child.id] = childEntry
}

function requirer(id) {
  return loadCJS(id, this).exports
}

function runCJS(runtime, moduleWrapper, req) {
  const mod = runtime.module
  const { entry } = runtime
  const { filename } = mod
  const { options } = runtime
  const exported = mod.exports = entry.exports

  if (! options.cjs) {
    req = assign(makeRequireFunction(mod, requirer), req)
  }

  moduleWrapper.call(exported, exported, req, mod, filename, dirname(filename))
  mod.loaded = true

  entry.merge(Entry.get(mod, mod.exports, options))
  entry.exports = mod.exports
  entry.sourceType = getSourceType(entry.exports)

  Entry.set(mod.exports, entry)
  entry.update().loaded()
}

function runESM(runtime, moduleWrapper) {
  const mod = runtime.module
  const { entry } = runtime
  const exported = mod.exports = entry.exports
  const { options } = runtime

  moduleWrapper.call(options.cjs ? exported : void 0)
  mod.loaded = true

  entry.update().loaded()
  assign(exported, entry._namespace)
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
