import assignProperty from "./util/assign-property.js"
import createOptions from "./util/create-options.js"
import getModuleName from "./util/get-module-name.js"
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

const toStringTagDescriptor = {
  configurable: false,
  enumerable: false,
  value: "Module",
  writable: false
}

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
    // The namespace object CJS importers receive.
    this.cjsNamespace = this._namespace
    // The namespace object ESM importers receive.
    this.esmNamespace = this._namespace
    // The `module.exports` of the module.
    this.exports = exported
    // Getters for local variables exported from the module.
    this.getters = Object.create(null)
    // The id of the module.
    this.id = mod.id
    // The module this entry is managing.
    this.module = mod
    // The package options for this entry.
    this.options = createOptions(options)
    // Setters for assigning to local variables in parent modules.
    this.setters = Object.create(null)
    // Set the default source type.
    this.sourceType = getSourceType(exported)
  }

  static get(mod, exported, options) {
    if (arguments.length === 1) {
      exported = mod.exports
    }

    let entry

    if (! isObjectLike(exported)) {
      // Create a temporary `Entry` object to call `entry.addSetters()` and
      // trigger `entry.update()`, so that `runtime.watch()` behaves as expected.
      entry = new Entry(mod, exported)
      entry.loaded()
      return entry
    }

    entry = entryMap.get(exported)

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
      const namespace = Object.create(null)

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
      return this.esmNamespace = this._namespace = Object.seal(namespace)
    })

    setSetter(this, "esmNamespace", (value) => {
      setProperty(this, "esmNamespace", { value })
    })

    setGetter(this, "cjsNamespace", () => {
      const namespace = Object.create(null)

      // Section 4.6
      // Step 4: Create an ESM with `{default:module.exports}` as its namespace
      // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#46-es-consuming-commonjs
      namespace.default = this.exports

      setNamespaceToStringTag(namespace)
      return this.cjsNamespace = Object.seal(namespace)
    })

    setSetter(this, "cjsNamespace", (value) => {
      setProperty(this, "cjsNamespace", { value })
    })

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
      parentsMap[id].update()
    }

    return this
  }
}

function assignExportsToNamespace(entry) {
  const { _namespace, exports:exported } = entry
  const isSafe = entry.sourceType !== "script"

  if (! isSafe) {
    // Hardcode "default" as `module.exports` for CommonJS scripts.
    _namespace.default = exported
  }

  const names = keys(exported)

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

    for (const setter of setters) {
      const value = getExportByName(setter.parent, entry, name)
      if (entry._changed || changed(setter, name, value)) {
        callback(setter, value)
      }
    }
  }

  entry._changed = false
}

function getExportByName(parent, entry, name) {
  const { options } = parent
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
    const moduleName = getModuleName(entry.module)

    throw new SyntaxError("Module " + toStringLiteral(moduleName, "'") +
      " does not provide an export named '" + name + "'")
  }

  return _namespace[name]
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

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
