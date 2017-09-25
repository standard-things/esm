// This module is critical for @std/esm versioning support and should be changed
// as little as possible. Please ensure any changes are backwards compatible.

import NullObject from "./null-object.js"

import has from "./util/has.js"
import maxSatisfying from "./util/max-satisfying.js"
import { version } from "./version.js"

const wrapSym = Symbol.for("@std/esm:wrapper")

class Wrapper {
  static find(object, key, range) {
    const map = getMap(object, key)

    if (map) {
      const version = maxSatisfying(map.versions, range)

      if (version) {
        return map.wrappers[version]
      }
    }

    return null
  }

  static manage(object, key, wrapper) {
    const raw = Wrapper.unwrap(object, key)
    const manager = function (...args) {
      return wrapper.call(this, manager, raw, args)
    }

    manager[wrapSym] = raw
    object[key] = manager
  }

  static unwrap(object, key) {
    const manager = object[key]
    return has(manager, wrapSym) ? manager[wrapSym]  : manager
  }

  static wrap(object, key, wrapper) {
    const map = getOrCreateMap(object, key)

    if (typeof map.wrappers[version] !== "function") {
      map.versions.push(version)
      map.wrappers[version] = wrapper
    }
  }
}

function createMap(object, key) {
  const map = new NullObject
  map.raw = Wrapper.unwrap(object, key)
  map.versions = []
  map.wrappers = new NullObject

  // Store the wrapper map as object[wrapSym][key] rather than on the
  // function, so that other code can modify the same property  without
  // interfering with our wrapper logic.
  return getOrCreateStore(object)[key] = map
}

function createStore(object) {
  return object[wrapSym] = new NullObject
}

function getMap(object, key) {
  const store = getStore(object)
  return (store && key in store) ? store[key] : null
}

function getOrCreateMap(object, key) {
  return getMap(object, key) || createMap(object, key)
}

function getOrCreateStore(object) {
  return getStore(object) || createStore(object)
}

function getStore(object) {
  return has(object, wrapSym) ? object[wrapSym] : null
}

Object.setPrototypeOf(Wrapper.prototype, null)

export default Wrapper
