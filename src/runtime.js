import Compiler from "./caching-compiler.js"
import Entry from "./entry.js"
import SafeObject from "./builtin/object.js"

import _loadESM from "./module/esm/_load.js"
import builtinEntries from "./builtin-entries.js"
import hasPragma from "./parse/has-pragma.js"
import identity from "./util/identity.js"
import loadESM from "./module/esm/load.js"
import makeRequireFunction from "./module/make-require-function.js"
import moduleState from "./module/state.js"
import setDeferred from "./util/set-deferred.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"

const indirectEval = eval

const Runtime = {
  __proto__: null,

  compileEval(content) {
    // Section 18.2.1.1: Runtime Semantics: PerformEval ( x, evalRealm, strictCaller, direct )
    // Setp 2: Only evaluate strings.
    // https://tc39.github.io/ecma262/#sec-performeval
    return typeof content === "string"
      ? Compiler.compile(this.entry, content, { eval: true }).code
      : content
  },

  compileGlobalEval(content) {
    if (typeof content !== "string") {
      return content
    }

    const { entry } = this
    const result = Compiler.compile(entry, content, { eval: true })

    if (! result.changed) {
      return content
    }

    const { runtimeName } = entry
    const { blockScopedDeclarations } = shared.support

    content = result.code

    if (global[runtimeName]) {
      return content
    }

    if (blockScopedDeclarations) {
      content =
        (hasPragma(content, "use strict") ? '"use strict";' : "") +
        "let " + runtimeName + "=global." + runtimeName + ";" +
        content

      setProperty(global, runtimeName, {
        enumerable: false,
        get: () => {
          delete global[runtimeName]
          return this
        }
      })
    } else if (! (runtimeName in global)) {
      const globalImport = this.import.bind({
        __proto__: null,
        entry
      })

      const globalRuntime = { __proto__: null }

      setProperty(globalRuntime, "i", {
        enumerable: false,
        value: globalImport
      })

      setProperty(global, runtimeName, {
        configurable: false,
        enumerable: false,
        value: globalRuntime,
        writable: false
      })

      SafeObject.freeze(globalImport)
      SafeObject.freeze(globalRuntime)
    }

    return content
  },

  // Register a getter function that always returns the given value.
  default(value) {
    this.export([["default", () => value]])
  },

  enable(entry, exported) {
    const mod = entry.module
    const object = mod.exports

    entry.exports = exported
    Entry.set(mod, exported, entry)

    object.compileGlobalEval = Runtime.compileGlobalEval
    object.entry = entry

    setDeferred(object, "meta", () => {
      return {
        __proto__: null,
        url: entry.url
      }
    })

    object._ = object
    object.c = object.compileEval = Runtime.compileEval.bind(object)
    object.d = object.default = Runtime.default
    object.e = object.export = Runtime.export
    object.g = object.globalEval = Runtime.globalEval.bind(object)
    object.i = object.import = Runtime.import
    object.k = identity
    object.n = object.nsSetter = Runtime.nsSetter
    object.r = object.run = Runtime.run
    object.u = object.update = Runtime.update
    object.v = indirectEval
    object.w = object.watch = Runtime.watch
  },

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterPairs) {
    this.entry.addGetters(getterPairs)
  },

  globalEval(content) {
    return indirectEval(this.compileGlobalEval(content))
  },

  import(request) {
    // Section 2.2.1: Runtime Semantics: Evaluation
    // Step 6: Coerce request to a string.
    // https://tc39.github.io/proposal-dynamic-import/#sec-import-call-runtime-semantics-evaluation
    if (typeof request !== "string") {
      request = String(request)
    }

    return new Promise((resolve, reject) => {
      setImmediate(() => {
        const { entry } = this

        const setterPairs = [["*", createSetter("import", (value, childEntry) => {
          if (childEntry._loaded === 1) {
            resolve(value)
          }
        })]]

        if (request in builtinEntries) {
          return watchBuiltin(entry, request, setterPairs)
        }

        try {
          watchImport(entry, request, setterPairs, loadESM)
        } catch (e) {
          reject(e)
        }
      })
    })
  },

  nsSetter() {
    return createSetter("nsSetter", (value, childEntry) => {
      this.entry.addGettersFrom(childEntry)
    })
  },

  run(moduleWrapper) {
    const { entry } = this
    const cached = entry.package.cache.compile[entry.cacheName]
    const isESM = cached && cached.esm
    const runner =  isESM ? runESM : runCJS
    return runner(entry, moduleWrapper)
  },

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
  },

  watch(request, setterPairs) {
    const { entry } = this

    return request in builtinEntries
      ? watchBuiltin(entry, request, setterPairs)
      : watchImport(entry, request, setterPairs, _loadESM)
  }
}

function createSetter(from, setter) {
  setter.from = from
  return setter
}

function runCJS(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports
  const req = makeRequireFunction(mod)

  entry.exports = null
  return moduleWrapper.call(exported, shared.global, exported, req)
}

function runESM(entry, moduleWrapper) {
  const mod = entry.module
  const exported = mod.exports = entry.exports

  entry.exports = null

  let result

  if (entry.package.options.cjs.vars) {
    const req = makeRequireFunction(mod)
    req.main = moduleState.mainModule
    result = moduleWrapper.call(exported, shared.global, exported, req)
  } else {
    result = moduleWrapper.call(void 0, shared.global)
  }

  // Set the loaded state here in case the module was sideloaded.
  mod.loaded = true
  entry.update().loaded()
  return result
}

function watchBuiltin(entry, request, setterPairs) {
  entry.module.require(request)

  builtinEntries[request]
    .addSetters(setterPairs, entry)
    .update()
}

function watchImport(entry, request, setterPairs, loader) {
  moduleState.requireDepth += 1
  moduleState.passthru = true

  const mod = entry.module

  let childEntry

  try {
    childEntry = loader(request, mod, false, (childEntry) => {
      childEntry.addSetters(setterPairs, entry)
    })
  } finally {
    moduleState.passthru = false
    moduleState.requireDepth -= 1
  }

  entry._requireESM = true
  mod.require(request)

  childEntry.loaded()
  childEntry.update()
}

export default Runtime
