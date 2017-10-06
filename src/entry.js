import NullObject from "./null-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import assign from "./util/assign.js"
import assignProperty from "./util/assign-property.js"
import createOptions from "./util/create-options.js"
import env from "./env.js"
import { format } from "util"
import getModuleName from "./util/get-module-name.js"
import getSourceType from "./util/get-source-type.js"
import has from "./util/has.js"
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
const STAR_ERROR = {}

const entryMap = new SafeWeakMap

const useToStringTag = typeof Symbol.toStringTag === "symbol"

const esmDescriptor = {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
}

const toStringTagDescriptor = {
  configurable: false,
  enumerable: false,
  value: "Module",
  writable: false
}

class Entry {
  constructor(mod, exported, options) {
    /* eslint-disable lines-around-comment */
    // The namespace object change indicator.
    this._changed = true
    // The loading state of the module.
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
    // The source type of the module.
    this.sourceType = getSourceType(exported)
    // The file url of the module.
    this.url = null
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

    if (entry) {
      return entry
    }

    entry = new Entry(mod, exported, options)
    entryMap.set(mod, entry)

    if (useExports) {
      entryMap.set(exported, entry)
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

  addGetter(name, getter) {
    getter.owner = this.module
    this.getters[name] = getter
    return this
  }

  addGetters(getterPairs) {
    if (getterPairs) {
      for (const [name, getter] of getterPairs) {
        this.addGetter(name, getter)
      }
    }

    return this
  }

  addGettersFrom(otherEntry) {
    const { getters } = this
    const { _namespace:otherNamespace, getters:otherGetters } = otherEntry

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

      const { id } = getter.owner

      if (id !== otherGetter.owner.id &&
          id !== this.id) {
        this.addGetter(key, () => STAR_ERROR)
      }
    }

    return this
  }

  addSetter(name, setter, parent) {
    const setters = this.setters[name] || (this.setters[name] = [])
    setter.last = new NullObject
    setter.parent = parent
    setters.push(setter)
    return this
  }

  addSetters(setterPairs, parent) {
    if (setterPairs) {
      for (const [name, setter] of setterPairs) {
        this.addSetter(name, setter, parent)
      }
    }

    return this
  }

  loaded() {
    if (this._loaded) {
      return this._loaded
    }

    if (! this.module.loaded) {
      return this._loaded = 0
    }

    this._loaded = -1

    const { children } = this

    for (const id in children) {
      if (! children[id].loaded()) {
        return this._loaded = 0
      }
    }

    assignExportsToNamespace(this)

    const { _namespace, getters } = this

    for (const name in _namespace) {
      if (! (name in getters)) {
        this.addGetter(name, () => this._namespace[name])
      }
    }

    if (this.sourceType === "module") {
      const { exports:exported } = this

      validateSetters(this)
      assign(exported, _namespace)

      if (this.options.cjs &&
          ! has(exported, "__esModule")) {
        setProperty(exported, "__esModule", esmDescriptor)
      }

      seal(exported)
    }

    setGetter(this, "esmNamespace", () => {
      // Section 9.4.6
      // Module namespace objects have a null [[Prototype]].
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      const namespace = new NullObject

      // Section 9.4.6.11
      // Step 7: Module namespace objects have sorted properties.
      // https://tc39.github.io/ecma262/#sec-modulenamespacecreate
      const { _namespace } = this
      const names = sort.call(keys(_namespace))
      const safe = isSafe(this)

      for (const name of names) {
        if (safe) {
          namespace[name] = _namespace[name]
        } else {
          assignProperty(namespace, _namespace, name)
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

    return this._loaded = 1
  }

  merge(otherEntry) {
    if (otherEntry !== this) {
      for (const key in otherEntry) {
        mergeProperty(this, otherEntry, key)
      }
    }

    return this
  }

  update() {
    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    let parentsMap

    forEachSetter(this, (setter, value) => {
      parentsMap || (parentsMap = new NullObject)
      parentsMap[setter.parent.id] = setter.parent
      setter(value, this)
    })

    // If any of the setters updated the bindings of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    for (const id in parentsMap) {
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
  const isScript = entry.sourceType === "script"

  if (isScript) {
    _namespace.default = exported
  }

  if (! isObjectLike(exported)) {
    return
  }

  const safe = isSafe(entry)
  const object = entry._loaded === 1 ? _namespace : exported
  const names = safe ? keys(object) : keysAll(object)

  for (const name of names) {
    if (safe) {
      _namespace[name] = exported[name]
    } else if (! isScript || name !== "default") {
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

  const settersMap = entry.setters

  for (const name in settersMap) {
    const setters = settersMap[name]

    if (! setters.length) {
      continue
    }

    for (const setter of setters) {
      const value = getExportByName(entry, setter, name)

      if (entry._changed ||
          changed(setter, name, value)) {
        callback(setter, value)
      }
    }
  }

  entry._changed = false
}

function getExportByName(entry, setter, name) {
  const isScript =
    entry.sourceType !== "module" &&
    ! setter.parent.options.cjs

  if (name === "*") {
    return isScript ? entry.cjsNamespace : entry.esmNamespace
  }

  if (isScript &&
      name === "default") {
    return entry.exports
  }

  const { _namespace } = entry

  if (isScript ||
      (entry._loaded === 1 &&
       ! (name in _namespace))) {
    raiseExportMissing(entry, name)
  }

  const value = _namespace[name]

  if (value === STAR_ERROR) {
    raiseExportStarConflict(entry, name)
  }

  return value
}

function isSafe(entry) {
  return entry.sourceType !== "script" &&  ! entry.options.cjs
}

function mergeProperty(entry, otherEntry, key) {
  const { _loaded } = entry

  if (_loaded !== 1 &&
      key === "namespace") {
    return assignProperty(entry, otherEntry, key)
  }

  const value = otherEntry[key]

  if (key !== "setters") {
    if (key === "children") {
      assign(entry.children, value)
    } else if (key === "getters") {
      for (const name in value) {
        entry.addGetter(name, value[name])
      }
    } else if (key ===  "_loaded"
        ? value > _loaded
        : value != null) {
      entry[key] = value
    }

    return entry
  }

  const settersMap = entry.setters

  for (const name in value) {
    const setters = settersMap[name]
    const otherSetters = settersMap[name] = value[name]

    if (setters) {
      for (const setter of setters) {
        if (otherSetters.indexOf(setter) === -1) {
          otherSetters.push(setter)
        }
      }
    }
  }

  return entry
}

function raiseExport(entry, name, message) {
  if (env.repl) {
    // Remove problematic getter and setter to unblock subsequent imports.
    delete entry.getters[name]
    delete entry.setters[name]
  }

  const moduleName = getModuleName(entry.module)
  throw new SyntaxError(format(message, toStringLiteral(moduleName, "'"), name))
}

function raiseExportMissing(entry, name) {
  raiseExport(entry, name, "Module %s does not provide an export named '%s'")
}

function raiseExportStarConflict(entry, name) {
  raiseExport(entry, name, "Module %s contains conflicting star exports for name '%s'")
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

  const { _namespace, getters } = entry

  for (const name in getters) {
    const value = runGetter(getters[name])

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

  for (const name in setters) {
    if (name !== "*" &&
        ! (name in getters)) {
      raiseExportMissing(entry, name)
    }
  }
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
