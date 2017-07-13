import Entry from "./entry.js"
import FastObject from "./fast-object.js"
import Module from "module"
import path from "path"
import URL from "url"
import utils from "./utils.js"

const codeOfDot = ".".charCodeAt(0)
const codeOfForwardSlash = "/".charCodeAt(0)
const nodeModulePaths = Module._nodeModulePaths
const resolveFilename = Module._resolveFilename
const resolveCache = new FastObject

class Runtime {
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

    object.entry = Entry.get(exported, mod)
    object.module = mod
  }

  // Register a getter function that always returns the given value.
  default(value) {
    return this.export([["default", () => value]], true)
  }

  // Register getter functions for local variables in the scope of an export
  // statement. Pass true as the second argument to indicate that the getter
  // functions always return the same values.
  export(getterPairs, constant) {
    this.entry.addGetters(getterPairs, constant)
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

  // Returns a function that takes a namespace object and copies the
  // properties of the namespace to entry.exports, which is useful for
  // implementing `export * from "module"` syntax.
  nsSetter() {
    return (namespace) => {
      const entry = this.entry

      for (const key in namespace) {
        if (key !== "default") {
          entry.namespace[key] = namespace[key]
        }
      }
    }
  }

  run(wrapper, loose) {
    const entry = this.entry
    const exported = this.module.exports = entry.exports

    wrapper.call(loose ? exported : void 0)
    this.module.loaded = true
    this.update()
    this.entry.loaded()

    for (const key in entry.bindings) {
      exported[key] = entry.bindings
    }
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
    const mod = this.module
    id = resolveId(id, mod)

    const parentEntry = this.entry
    const children = parentEntry.children

    const childExports = mod.require(id)
    const childId = resolveFilename(id, mod, false)
    const childModule = Module._cache[childId]
    const childEntry = Entry.get(childExports, childModule)

    children.set(childId, childEntry)

    if (setterPairs !== void 0) {
      childEntry.addSetters(setterPairs, mod).update()
    }
  }
}

function resolveId(id, parent) {
  if (typeof id !== "string") {
    return id
  }

  const filename = parent.filename === null ? "." : parent.filename
  const cacheKey = id + "\0" + filename

  if (cacheKey in resolveCache) {
    return resolveCache[cacheKey]
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
      return resolveCache[cacheKey] = id
    }
    // Prevent resolving non-local dependencies:
    // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
    const paths = nodeModulePaths(path.dirname(filename))
    // Overwrite concat() to prevent global paths from being concatenated.
    paths.concat = () => paths
    // Ensure a parent id and filename are provided to avoid going down the
    // --eval branch of Module._resolveLookupPaths().
    return resolveCache[cacheKey] = resolveFilename(id, { filename, id: "<mock>", paths })
  }

  if (noPathname || parsed.protocol !== "file:") {
    const error = new Error("Cannot find module " + id)
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

  return resolveCache[cacheKey] = resolveFilename(prefix + host + pathname, parent, false)
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
