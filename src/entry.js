import NullObject from "./null-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import assignProperty from "./util/assign-property.js"
import createOptions from "./util/create-options.js"
import getModuleName from "./util/get-module-name.js"
import getSourceType from "./util/get-source-type.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import keysAll from "./util/keys-all.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"
import toStringLiteral from "./util/to-string-literal.js"

const { is, seal } = Object
const { sort } = Array.prototype

const GETTER_ERROR = {}
const entryMap = new SafeWeakMap
const useToStringTag = typeof Symbol.toStringTag === "symbol"

const toStringTagDescriptor = createOptions({
  configurable: false,
  enumerable: false,
  value: "Module",
  writable: false
})

class Entry {
  constructor(mod, exported, options) {
    /* eslint-disable lines-around-comment */
    // A boolean indicating whether the module namespace has changed.
    this._changed = true
    // A number indicating the loading state of the module.
    this._loaded = 0
    // The raw namespace object.
    this._namespace = new NullObject
    // The child entries of the module.
    this.children = new NullObject
    // The namespace object CJS importers receive.
    this.cjsNamespace = this._namespace
    // The namespace object ESM importers receive.
    this.esmNamespace = this._namespace
    // The `module.exports` of the module.
    this.exports = exported
    // Getters for local variables exported from the module.
    this.getters = new NullObject
    // The id of the module.
    this.id = mod.id
    // The module this entry is managing.
    this.module = mod
    // The package options for this entry.
    this.options = createOptions(options)
    // Setters for assigning to local variables in parent modules.
    this.setters = new NullObject
    // Set the default source type.
    this.sourceType = getSourceType(exported)
    /* eslint-enable lines-around-comment */
  }

  static get(mod, exported, options) {
    if (arguments.length === 1) {
      exported = mod.exports
    }

    let entry
    const useExports = isObjectLike(exported)

    if (useExports) {
      entry = entryMap.get(exported) || entryMap.get(mod)
    } else {
      entry = entryMap.get(mod)
    }

    if (entry === void 0) {
      entry = new Entry(mod, exported, options)
      entryMap.set(mod, entry)

      if (useExports) {
        entryMap.set(exported, entry)
      }
    }

    return entry
  }

  static has(key) {
    return entryMap.has(key)
  }

  static set(key, entry) {
    if (isObjectLike(key)) {
      entryMap.set(key, entry)
    }
  }

  addGetters(getterPairs) {
    for (const [name, getter] of getterPairs) {
      getter.owner = this.module
      this.getters[name] = getter
    }

    return this
  }

  addGettersFrom(otherEntry) {
    const { _namespace, getters } = this
    const { _namespace:otherNamespace, getters:otherGetters } = otherEntry
    const isSafe = otherEntry.sourceType !== "script"

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
        if (isSafe) {
          _namespace[key] = otherNamespace[key]
        } else {
          assignProperty(_namespace, otherNamespace, key)
        }
      } else {
        throw new SyntaxError("Identifier '" + key + "' has already been declared")
      }
    }

    return this
  }

  addSetters(setterPairs, parent) {
    for (const [name, setter] of setterPairs) {
      let setters = this.setters[name]

      if (setters === void 0) {
        setters = []
        this.setters[name] = setters
      }
      setter.last = new NullObject
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

    const { children } = this
    const ids = keys(children)

    for (const id of ids) {
      if (! children[id].loaded()) {
        return this._loaded = 0
      }
    }

    setGetter(this, "esmNamespace", () => {
      const isSafe = this.sourceType !== "script"

      // Section 9.4.6
      // Module namespace objects have a null [[Prototype]].
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      const namespace = new NullObject

      // Section 9.4.6.11
      // Step 7: Module namespace objects have sorted properties.
      // https://tc39.github.io/ecma262/#sec-modulenamespacecreate
      const raw = this._namespace
      const names = sort.call(keys(raw))

      for (const name of names) {
        if (isSafe) {
          namespace[name] = raw[name]
        } else {
          assignProperty(namespace, raw, name)
        }
      }

      // Section 26.3.1
      // Module namespace objects have a @@toStringTag value of "Module".
      // https://tc39.github.io/ecma262/#sec-@@tostringtag
      setNamespaceToStringTag(namespace)

      // Section 9.4.6
      // Module namespace objects are not extensible.
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      return this.esmNamespace = this._namespace = seal(namespace)
    })

    setSetter(this, "esmNamespace", (value) => {
      setProperty(this, "esmNamespace", { value })
    })

    setGetter(this, "cjsNamespace", () => {
      const namespace = new NullObject

      // Section 4.6
      // Step 4: Create an ESM with `{default:module.exports}` as its namespace
      // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#46-es-consuming-commonjs
      namespace.default = this.exports

      setNamespaceToStringTag(namespace)
      return this.cjsNamespace = seal(namespace)
    })

    setSetter(this, "cjsNamespace", (value) => {
      setProperty(this, "cjsNamespace", { value })
    })

    if (this.sourceType === "module") {
      validateSetters(this)
    }

    return this._loaded = 1
  }

  merge(otherEntry) {
    if (otherEntry !== this) {
      for (const key in otherEntry) {
        assignProperty(this, otherEntry, key)
      }
    }

    return this
  }

  update() {
    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    const parentsMap = new NullObject

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
      parentsMap[id].update()
    }

    return this
  }
}

function assignExportsToNamespace(entry) {
  const { _namespace, exports:exported, sourceType } = entry
  const isSafe = sourceType !== "script"

  if (! isSafe) {
    // Hardcode "default" as `module.exports` for CommonJS scripts.
    _namespace.default = exported
  }

  const names = isSafe ? keys(exported) : keysAll(exported)

  for (const name of names) {
    if (isSafe) {
      _namespace[name] = exported[name]
    } else if (name !== "default") {
      assignProperty(_namespace, exported, name)
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
  return key in object && is(object[key], value)
}

// Invoke the given callback for every setter that needs to be called.
// Note: forEachSetter() does not call setters directly, only the given callback.
function forEachSetter(entry, callback) {
  entry._changed = false
  runGetters(entry)

  const names = keys(entry.setters)

  for (const name of names) {
    const setters = entry.setters[name]

    if (! setters.length) {
      continue
    }

    for (const setter of setters) {
      const value = getExportByName(entry, setter, name)

      if (entry._changed || changed(setter, name, value)) {
        callback(setter, value)
      }
    }
  }

  entry._changed = false
}

function getExportByName(entry, setter, name) {
  const { options } = setter.parent
  const { _namespace, sourceType } = entry

  if (name === "*") {
    if (options.cjs) {
      return entry.esmNamespace
    }

    return sourceType === "module" ? entry.esmNamespace : entry.cjsNamespace
  }

  if (sourceType !== "module" && name === "default" &&
      (sourceType === "script" || ! options.cjs)) {
    return entry.exports
  }

  if ((entry._loaded && ! (name in _namespace)) ||
      (entry.sourceType !== "module" && ! options.cjs)) {
    raiseMissingExport(entry, name)
  }

  return _namespace[name]
}

function raiseMissingExport(entry, name) {
  // Remove setter to unblock other imports.
  delete entry.setters[name]

  const moduleName = getModuleName(entry.module)
  throw new SyntaxError("Module " + toStringLiteral(moduleName, "'") +
    " does not provide an export named '" + name + "'")
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

  const { _namespace } = entry
  const names = keys(entry.getters)

  for (const name of names) {
    const value = runGetter(entry.getters[name])

    if (value !== GETTER_ERROR &&
        ! compare(_namespace, name, value)) {
      entry._changed = true
      _namespace[name] = value
    }
  }
}

function setNamespaceToStringTag(namespace) {
  if (useToStringTag) {
    setProperty(namespace, Symbol.toStringTag, toStringTagDescriptor)
  }
}

function validateSetters(entry) {
  const { getters, setters } = entry
  const names = keys(setters)

  for (const name of names) {
    if (name !== "*" &&
        ! (name in getters)) {
      raiseMissingExport(entry, name)
    }
  }
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
