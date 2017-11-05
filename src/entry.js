import NullObject from "./null-object.js"
import PkgInfo from "./pkg-info.js"
import SafeWeakMap from "./safe-weak-map.js"

import assign from "./util/assign.js"
import assignProperty from "./util/assign-property.js"
import emitWarning from "./error/emit-warning.js"
import env from "./env.js"
import { format } from "util"
import getModuleName from "./util/get-module-name.js"
import has from "./util/has.js"
import isESM from "./util/is-es-module.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"
import toStringLiteral from "./util/to-string-literal.js"

const GETTER_ERROR = {}
const STAR_ERROR = {}

const { is, seal } = Object
const { sort } = Array.prototype
const { toStringTag } = Symbol

const entryMap = new SafeWeakMap

const useToStringTag = typeof toStringTag === "symbol"

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
  constructor(mod, exported) {
    /* eslint-disable lines-around-comment */
    // The namespace object change indicator.
    this._changed = false
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
    // The ES module type indicator.
    this.esm = isESM(exported)
    // The `module.exports` of the module.
    this.exports = exported
    // Getters for local variables exported from the module.
    this.getters = new NullObject
    // The id of the module.
    this.id = mod.id
    // The module this entry is managing.
    this.module = mod
    // The package options for this entry.
    this.options = PkgInfo.createOptions()
    // Setters for assigning to local variables in parent modules.
    this.setters = new NullObject
    // The file url of the module.
    this.url = null
    /* eslint-enable lines-around-comment */
  }

  static get(mod) {
    const exported = mod.exports
    const useExports = isObjectLike(exported)
    let entry = entryMap.get(useExports ? exported : mod)

    if (! entry) {
      entry = new Entry(mod, exported)
      entryMap.set(useExports ? exported : mod, entry)
    }

    return entry
  }

  static has(key) {
    return entryMap.has(key)
  }

  static set(mod, exported, entry) {
    entryMap.set(isObjectLike(exported) ? exported : mod, entry)
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

    if (this.esm) {
      const exported = this.exports
      assign(exported, this._namespace)

      if (this.options.cjs.babel &&
          ! has(exported, "__esModule")) {
        setProperty(exported, "__esModule", esmDescriptor)
      }

      seal(exported)
    } else {
      this.merge(Entry.get(this.module))

      const mod = this.module
      const exported = mod.exports

      this.esm = isESM(exported)
      this.exports = exported

      Entry.set(mod, exported, this)

      if (! mod.loaded) {
        return this._loaded = 0
      }
    }

    assignExportsToNamespace(this)

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

    this._changed = false

    runGetters(this)
    runSetters(this, (setter, value) => {
      parentsMap || (parentsMap = new NullObject)
      parentsMap[setter.parent.id] = setter.parent
      setter(value, this)
    })

    this._changed = false

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
  const { _namespace, exports:exported, getters } = entry

  const inModule =
    entry.esm ||
    !! (entry.options.cjs.babel &&
    has(exported, "__esModule") &&
    exported.__esModule)

  if (! inModule) {
    _namespace.default = exported

    if (! ("default" in getters)) {
      entry.addGetter("default", () => entry._namespace.default)
    }
  }

  if (! isObjectLike(exported)) {
    return
  }

  const safe = isSafe(entry)
  const object = entry._loaded === 1 ? _namespace : exported
  const names = keys(object)

  for (const name of names) {
    if (safe) {
      _namespace[name] = exported[name]
    } else if (inModule || name !== "default") {
      assignProperty(_namespace, exported, name)
    }

    if (! (name in getters)) {
      entry.addGetter(name, () => entry._namespace[name])
    }
  }
}

function callGetter(getter) {
  try {
    return getter()
  } catch (e) {}

  return GETTER_ERROR
}

function changed(setter, key, value) {
  const { last } = setter

  if (is(last[key], value)) {
    return false
  }

  last[key] = value
  return true
}

function getExportByName(entry, setter, name) {
  const isScript =
    ! entry.esm &&
    ! setter.parent.options.cjs.namedExports

  if (name === "*") {
    return isScript ? entry.cjsNamespace : entry.esmNamespace
  }

  if ((isScript &&
       name !== "default") ||
      (entry._loaded === 1 &&
       ! (name in entry.getters))) {
    raiseExportMissing(entry, name)
  }

  const value = entry._namespace[name]

  if (value === STAR_ERROR) {
    raiseExportStarConflict(entry, name)
  }

  return value
}

function isSafe(entry) {
  return entry.esm && ! entry.options.cjs
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

function runGetter(entry, name) {
  const { _namespace } = entry
  const value = callGetter(entry.getters[name])

  if (value !== GETTER_ERROR &&
      ! (name in _namespace &&
      is(_namespace[name], value))) {
    entry._changed = true
    _namespace[name] = value
  }
}

function runGetters(entry) {
  if (entry.esm) {
    for (const name in entry.getters) {
      runGetter(entry, name)
    }
  } else {
    assignExportsToNamespace(entry)
  }
}

function runSetter(entry, name, callback) {
  const { children, getters } = entry
  const { warnings } = entry.options

  const moduleName = getModuleName(entry.module)
  const nsChanged = name === "*" && entry._changed

  for (const setter of entry.setters[name]) {
    const nsSetter = setter.from === "nsSetter"
    const force = nsChanged && nsSetter
    const value = force ? void 0 : getExportByName(entry, setter, name)

    if (force ||
        changed(setter, name, value)) {
      callback(setter, value)
    } else if (warnings &&
        value === void 0 &&
        name in getters &&
        setter.parent.id in children) {
      emitWarning("Possible temporal dead zone access of '" + name + "' in " + moduleName)
    }
  }
}

function runSetters(entry, callback) {
  for (const name in entry.setters) {
    runSetter(entry, name, callback)
  }
}

function setNamespaceToStringTag(object) {
  return useToStringTag
    ? setProperty(object, toStringTag, toStringTagDescriptor)
    : object
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
