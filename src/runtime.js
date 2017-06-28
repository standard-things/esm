import Entry from "./entry.js"
import Module from "module"
import path from "path"
import URL from "url"
import utils from "./utils.js"

const resolveFilename = Module._resolveFilename

class Runtime {
  // The exports.enable method can be used to enable the @std/esm runtime for
  // specific module objects, or for Module.prototype (where implemented),
  // to make the runtime available throughout the entire module system.
  static enable(object) {
    if (typeof object.export === "function" &&
        typeof object.import === "function") {
      return
    }

    let i = -1
    const proto = this.prototype
    const keys = Object.getOwnPropertyNames(proto)
    const keyCount = keys.length

    while (++i < keyCount) {
      const key = keys[i]
      if (key !== "constructor") {
        object[key] = proto[key]
      }
    }
  }

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterPairs, constant) {
    utils.setESModule(this.exports)

    const entry = Entry.getOrCreate(this.exports, this)
    entry.addGetters(getterPairs, constant)

    if (this.loaded) {
      // If the module has already been evaluated, then we need to trigger
      // another round of entry.runSetters calls, which begins by calling
      // entry.runGetters(module).
      entry.runSetters()
    }
  }

  // Register a getter function that always returns the given value.
  exportDefault(value) {
    return this.export([["default", () => value]], true)
  }

  import(id) {
    return new Promise((resolve, reject) => {
      try {
        let ns
        this.watch(id, [["*", (value) => ns = value]])
        setImmediate(() => resolve(ns))
      } catch (e) {
        setImmediate(() => reject(e))
      }
    })
  }

  // Returns a function that takes a namespace object and copies the
  // properties of the namespace to module.exports, which is useful for
  // implementing `export * from "module"` syntax.
  makeNsSetter() {
    return (namespace) => Object.assign(this.exports, namespace)
  }

  run(wrapper) {
    utils.setESModule(this.exports)
    const entry = Entry.getOrCreate(this.exports, this)

    wrapper()
    this.loaded = true
    this.runSetters()
    entry.loaded()
  }

  // Platform-specific code should find a way to call this method whenever
  // the module system is about to return module.exports from require. This
  // might happen more than once per module, in case of dependency cycles,
  // so we want Module.prototype.runSetters to run each time.
  runSetters(valueToPassThrough) {
    let entry = Entry.get(this.exports)
    if (entry !== null) {
      // If there's not already an Entry object for this module, then there
      // won't be any setters to run.
      entry.runSetters()
    }

    if (this.loaded) {
      // If this module has already loaded, then we have to create an Entry
      // object, so that we can call entry.loaded().
      if (entry === null) {
        entry = Entry.getOrCreate(this.exports, this).runSetters()
      }

      entry.loaded()
    }

    // Assignments to exported local variables get wrapped with calls to
    // module.runSetters, so module.runSetters returns the
    // valueToPassThrough parameter to allow the value of the original
    // expression to pass through. For example,
    //
    //   export let a = 1
    //   console.log(a += 3)
    //
    // becomes
    //
    //   module.export("a", () => a)
    //   let a = 1
    //   console.log(module.runSetters(a += 3))
    //
    // This ensures module.runSetters runs immediately after the assignment,
    // and does not interfere with the larger computation.
    return valueToPassThrough
  }

  watch(id, setterPairs) {
    id = resolveId(id, this)
    utils.setESModule(this.exports)

    const parentEntry = Entry.getOrCreate(this.exports, this)
    const exported = this.require(id)
    const childModule = Module._cache[resolveFilename(id, this, false)]
    const childEntry = Entry.getOrCreate(exported, childModule)

    if (parentEntry.children.indexOf(childEntry) < 0) {
      parentEntry.children.push(childEntry)
    }
    if (setterPairs !== void 0) {
      childEntry.addSetters(setterPairs, this).runSetters()
    }
  }
}

function resolveId(id, parent) {
  const parsed = typeof id === "string" && id.includes(":")
    ? URL.parse(id)
    : null

  if (parsed === null || typeof parsed.protocol !== "string") {
    return id
  }
  // Based on file-uri-to-path.
  // Copyright Nathan Rajlich. Released under MIT license:
  // https://github.com/TooTallNate/file-uri-to-path
  if (parsed.protocol !== "file:" || parsed.pathname === null) {
    throw new TypeError
  }

  let host = parsed.host
  let pathname = unescape(parsed.pathname)
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
  pathname = path.normalize(pathname.replace(/^\/([a-zA-Z])[:|]/, '$1:'))

  return resolveFilename(prefix + host + pathname, parent, false)
}

Object.setPrototypeOf(Runtime.prototype, null)

export default Runtime
