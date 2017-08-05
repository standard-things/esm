import assignProperty from "./util/assign-property.js"
import { basename } from "path"
import createOptions from "./util/create-options.js"
import getSourceType from "./util/get-source-type.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"
import toStringLiteral from "./util/to-string-literal.js"

const GETTER_ERROR = {}
const entryMap = new WeakMap
const { sort } = Array.prototype
const useToStringTag = typeof Symbol.toStringTag === "symbol"

class Entry {
  /* eslint lines-around-comment: off */
  constructor(mod, exported, options) {
    // A boolean indicating whether the module namespace has changed.
    this._changed = true
    // A number indicating the loading state of the module.
    this._loaded = 0
    // The raw namespace object.
    this._namespace = Object.create(null)
    // The child entries of the module.
    this.children = Object.create(null)
    // The `module.exports` of the module.
    this.exports = exported
    // Getters for local variables exported from the module.
    this.getters = Object.create(null)
    // The module this entry is managing.
    this.module = mod
    // The namespace object that importers receive.
    this.namespace = this._namespace
    // The package options for this entry.
    this.options = createOptions(options)
    // Setters for assigning to local variables in parent modules.
    this.setters = Object.create(null)
    // Set the default source type.
    this.sourceType = "script"
  }

  static get(mod, exported, options) {
    if (arguments.length === 1) {
      exported = mod.exports
    }

    if (! isObjectLike(exported)) {
      // Create a temporary `Entry` object to call `entry.addSetters()` and
      // trigger `entry.update()`, so that `runtime.watch()` behaves as expected.
      return new Entry(mod, exported)
    }

    let entry = entryMap.get(exported)

    if (entry === void 0) {
      entry = new Entry(mod, exported, options)
      entryMap.set(exported, entry)
    }

    return entry
  }

  static set(exported, entry) {
    if (isObjectLike(exported)) {
      entryMap.set(exported, entry)
    }
  }

  addGetters(getterPairs) {
    for (const pair of getterPairs) {
      const name = pair[0]
      const getter = pair[1]

      getter.owner = this.module
      this.getters[name] = getter
    }

    return this
  }

  addGettersFrom(otherEntry) {
    const getters = this.getters
    const namespace = this._namespace
    const isESM = otherEntry.sourceType !== "script"
    const otherGetters = otherEntry.getters
    const otherNamespace = otherEntry._namespace

    for (const key in otherNamespace) {
      if (key === "default") {
        continue
      }

      let getter = getters[key]
      const otherGetter = otherGetters[key]

      if (typeof getter !== "function" &&
          typeof otherGetter === "function") {
        getter = otherGetter
        getters[key] = getter
      }

      if (typeof getter !== "function" ||
          typeof otherGetter !== "function") {
        continue
      }

      if (getter.owner.id === otherGetter.owner.id) {
        if (isESM) {
          namespace[key] = otherNamespace[key]
        } else {
          assignProperty(namespace, otherNamespace, key)
        }
      } else {
        throw new SyntaxError("Identifier '" + key + "' has already been declared")
      }
    }

    return this
  }

  addSetters(setterPairs, parent) {
    for (const pair of setterPairs) {
      const name = pair[0]
      const setter = pair[1]
      let setters = this.setters[name]

      if (setters === void 0) {
        setters = []
        this.setters[name] = setters
      }
      setter.last = Object.create(null)
      setter.parent = parent
      setters.push(setter)
    }

    return this
  }

  loaded() {
    if (this._loaded) {
      return this._loaded
    }

    this._loaded = -1

    if (! this.module.loaded) {
      return this._loaded = 0
    }

    const children = this.children
    const ids = keys(children)

    for (const id of ids) {
      if (! children[id].loaded()) {
        return this._loaded = 0
      }
    }

    setGetter(this, "namespace", () => {
      // Section 9.4.6
      // Module namespace objects have a null [[Prototype]].
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      const namespace = Object.create(null)

      // Section 9.4.6.11
      // Step 7: Module namespace objects have sorted properties.
      // https://tc39.github.io/ecma262/#sec-modulenamespacecreate
      const raw = this._namespace
      const names = sort.call(keys(raw))

      for (const name of names) {
        assignProperty(namespace, raw, name)
      }

      // Section 26.3.1
      // Module namespace objects have a @@toStringTag value of "Module".
      // https://tc39.github.io/ecma262/#sec-@@tostringtag
      if (useToStringTag) {
        setProperty(namespace, Symbol.toStringTag, {
          configurable: false,
          enumerable: false,
          value: "Module",
          writable: false
        })
      }

      // Section 9.4.6
      // Module namespace objects are not extensible.
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      return this.namespace = this._namespace = Object.seal(namespace)
    })

    setSetter(this, "namespace", (value) => {
      setProperty(this, "namespace", { value })
    })

    return this._loaded = 1
  }

  merge(otherEntry) {
    if (otherEntry !== this) {
      for (const key in otherEntry) {
        if (key !== "sourceType") {
          assignProperty(this, otherEntry, key)
        }
      }
    }

    return this
  }

  update() {
    if (this.sourceType === "script") {
      this.sourceType = getSourceType(this.exports)
    }

    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    const parentsMap = Object.create(null)

    forEachSetter(this, (setter, value) => {
      parentsMap[setter.parent.id] = setter.parent
      setter(value, this)
    })

    // If any of the setters updated the bindings of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    const ids = keys(parentsMap)

    for (const id of ids) {
      // What happens if `parents[parentIDs[id]] === module`, or if
      // longer cycles exist in the parent chain? Thanks to our `setter.last`
      // bookkeeping in `changed()`, the `entry.update()` broadcast will only
      // proceed as far as there are any actual changes to report.
      Entry.get(parentsMap[id]).update()
    }

    return this
  }
}

function assignExportsToNamespace(entry) {
  const exported = entry.exports
  const namespace = entry._namespace
  const isESM = entry.sourceType !== "script"

  // Add a "default" property unless it's a Babel-like exports, in which case
  // the exported object should be namespace-like and safe to assign directly.
  if (! isESM) {
    namespace.default = exported

    // Section 4.6
    // Step 4: Create an ESM with `{default:module.exports}` as its namespace
    // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#46-es-consuming-commonjs
    if (! entry.options.cjs)  {
      return
    }
  }

  const names = keys(exported)

  for (const name of names) {
    if (isESM) {
      namespace[name] = exported[name]
    } else if (name !== "default") {
      assignProperty(namespace, exported, name)
    }
  }
}

function changed(setter, key, value) {
  if (compare(setter.last, key, value)) {
    return false
  }

  setter.last[key] = value
  return true
}

function compare(object, key, value) {
  return key in object && Object.is(object[key], value)
}

// Invoke the given callback for every setter that needs to be called.
// Note: forEachSetter() does not call setters directly, only the given callback.
function forEachSetter(entry, callback) {
  entry._changed = false

  const names = keys(entry.setters)

  if (names.length) {
    runGetters(entry)
  }

  for (const name of names) {
    const setters = entry.setters[name]

    if (! setters.length) {
      continue
    }

    const value = getExportByName(entry, name)

    for (const setter of setters) {
      if (entry._changed || changed(setter, name, value)) {
        callback(setter, value)
      }
    }
  }

  entry._changed = false
}

function getExportByName(entry, name) {
  if (name === "*") {
    return entry.namespace
  }

  const namespace = entry._namespace

  if (entry._loaded &&
      ! (name in namespace)) {
    const moduleName = basename(entry.module.filename)
    throw new SyntaxError("Module " + toStringLiteral(moduleName, "'") +
      " does not provide an export named '" + name + "'")
  }

  return namespace[name]
}

function runGetter(getter) {
  if (typeof getter === "function") {
    try {
      return getter()
    } catch (e) {}
  }

  return GETTER_ERROR
}

function runGetters(entry) {
  if (entry.sourceType !== "module") {
    assignExportsToNamespace(entry)
    return
  }

  const namespace = entry._namespace
  const names = keys(entry.getters)

  for (const name of names) {
    const value = runGetter(entry.getters[name])

    if (value !== GETTER_ERROR &&
        ! compare(namespace, name, value)) {
      entry._changed = true
      namespace[name] = value
    }
  }
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
