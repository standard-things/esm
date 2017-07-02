import Entry from "./entry.js"
import Module from "module"
import path from "path"
import URL from "url"
import utils from "./utils.js"

const codeOfDot = ".".charCodeAt(0)
const codeOfForwardSlash = "/".charCodeAt(0)
const nodeModulePaths = Module._nodeModulePaths
const resolveFilename = Module._resolveFilename

class Runtime {
  // The exports.enable method can be used to enable the @std/esm runtime for
  // specific module objects, or for Module.prototype (where implemented),
  // to make the runtime available throughout the entire module system.
  static enable(mod) {
    const object = mod.exports

    if (Object.getOwnPropertyNames(object).length) {
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

    const exported = Object.create(null)
    utils.setESModule(exported)

    object.entry =  Entry.getOrCreate(exported, mod)
    object.exports = exported
    object.module = mod
  }

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterPairs, constant) {
    this.entry.addGetters(getterPairs, constant)

    if (this.module.loaded) {
      // If the module has already been evaluated, then we need to trigger
      // another round of entry.runSetters calls, which begins by calling
      // entry.runGetters(module).
      this.entry.runSetters()
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

  run(wrapper, loose) {
    const exported = this.module.exports = this.entry.exports
    wrapper.call(loose ? exported : void 0)
    this.module.loaded = true
    this.runSetters()
    this.entry.loaded()
  }

  // Platform-specific code should find a way to call this method whenever
  // the module system is about to return module.exports from require. This
  // might happen more than once per module, in case of dependency cycles,
  // so we want Module.prototype.runSetters to run each time.
  runSetters(valueToPassThrough) {
    this.entry.runSetters()

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
    const mod = this.module
    id = resolveId(id, mod)

    const parentEntry = this.entry
    const childExports = mod.require(id)
    const childModule = Module._cache[resolveFilename(id, mod, false)]
    const childEntry = Entry.getOrCreate(childExports, childModule)

    if (parentEntry.children.indexOf(childEntry) < 0) {
      parentEntry.children.push(childEntry)
    }
    if (setterPairs !== void 0) {
      childEntry.addSetters(setterPairs, mod).runSetters()
    }
  }
}

function resolveId(id, parent) {
  if (typeof id !== "string") {
    return id
  }

  const code0 = id.charCodeAt(0)
  const code1 = id.charCodeAt(1)
  const isPath =
    code0 === codeOfForwardSlash ||
    (code0 === codeOfDot &&
      (code1 === codeOfForwardSlash ||
      (code1 === codeOfDot && id.charCodeAt(2) === codeOfForwardSlash))) ||
    id.includes(":")

  const noParse = ! isPath
  const parsed = noParse ? null : URL.parse(id)
  const noPathname = noParse || parsed.pathname === null

  id = noPathname ? id : unescape(parsed.pathname)

  if (noParse || typeof parsed.protocol !== "string") {
    if (isPath) {
      return id
    }
    // Prevent resolving non-local dependencies:
    // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
    const filename = parent.filename === null ? "./" : parent.filename
    const paths = nodeModulePaths(path.dirname(filename))
    paths.concat = () => paths
    return resolveFilename(id, { id: "<mock>", filename, paths })
  }
  // Based on file-uri-to-path.
  // Copyright Nathan Rajlich. Released under MIT license:
  // https://github.com/TooTallNate/file-uri-to-path
  if (noPathname || parsed.protocol !== "file:") {
    const error = new Error("Cannot find module " + id)
    error.code = "MODULE_NOT_FOUND"
    throw error
  }

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

  return resolveFilename(prefix + host + pathname, parent, false)
}

Object.setPrototypeOf(Runtime.prototype, null)

export default Runtime
