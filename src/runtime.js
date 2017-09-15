import Entry from "./entry.js"
import NullObject from "./null-object.js"

import assign from "./util/assign.js"
import builtinEntries from "./builtin-entries.js"
import { extname } from "path"
import getSourceType from "./util/get-source-type.js"
import has from "./util/has.js"
import loadCJS from "./module/cjs/load.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import moduleState from "./module/state.js"
import setProperty from "./util/set-property.js"

const esmDescriptor = {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
}

class Runtime {
  static enable(mod, exported, options) {
    const object = mod.exports
    const entry = Entry.get(mod, exported, options)

    object.entry = entry
    object.meta = new NullObject
    object.module = mod
    object.options = entry.options

    object._ = object
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

  run(moduleWrapper) {
    const runner = moduleWrapper.length ? runCJS : runESM
    runner(this, moduleWrapper)
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
    const { entry, module:mod, options } = this

    moduleState.requireDepth += 1

    try {
      const child = importModule(id, mod, loadESM, options)
      const childEntry = Entry.get(child)

      entry.children[child.id] = childEntry

      if (setterPairs) {
        childEntry.addSetters(setterPairs, entry).update()
      }
    } finally {
      moduleState.requireDepth -= 1
    }
  }
}

function importModule(id, parent, loader, options) {
  if (id in builtinEntries) {
    return builtinEntries[id]
  }

  const child = loader(id, parent, false, options)
  const { filename } = child

  if (getSourceType(child.exports) === "module") {
    if (! (options && options.cjs) &&
        extname(filename) === ".mjs") {
      delete __non_webpack_require__.cache[filename]
    }
  } else {
    delete moduleState.cache[filename]
  }

  return child
}

function runCJS(runtime, moduleWrapper) {
  const { entry, module:mod, options } = runtime
  const exported = mod.exports = entry.exports
  const loader = options.cjs ? loadESM : loadCJS
  const requirer = (id) => importModule(id, mod, loader, options).exports
  const req = makeRequireFunction(mod, requirer)

  moduleWrapper.call(exported, exported, req)
  mod.loaded = true

  entry.merge(Entry.get(mod, mod.exports, options))
  entry.exports = mod.exports
  entry.sourceType = getSourceType(entry.exports)

  Entry.set(mod.exports, entry)
  entry.update().loaded()
}

function runESM(runtime, moduleWrapper) {
  const { entry, module:mod, options } = runtime
  const exported = mod.exports = entry.exports

  moduleWrapper.call(options.cjs ? exported : void 0)
  mod.loaded = true

  entry.update().loaded()
  assign(exported, entry._namespace)

  if (options.cjs &&
      ! has(exported, "__esModule")) {
    setProperty(exported, "__esModule", esmDescriptor)
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
