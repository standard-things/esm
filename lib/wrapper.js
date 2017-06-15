"use strict"

const FastObject = require("./fast-object.js")
const path = require("path")
const utils = require("./utils.js")

const esmVersion = require("./version.js").version
const wrapSym = Symbol.for("__esmWrapper")

class Wrapper {
  static find(object, key, range) {
    const map = getMap(object, key)
    if (map !== null) {
      const version = utils.maxSatisfying(map.versions, range)
      if (version !== null) {
        return map.wrappers[version]
      }
    }
    return null
  }

  static manage(object, key, wrapper) {
    const func = object[key]
    const manager = function () {
      let argCount = arguments.length + 1
      const args = new Array(argCount--)

      while (argCount) {
        args[argCount] = arguments[--argCount]
      }
      args[0] = func
      return wrapper.apply(this, args)
    }

    manager[wrapSym] = func
    object[key] = manager
  }

  static unwrap(object, key) {
    const func = object[key]
    return utils.has(func, wrapSym)
      ? func[wrapSym]
      : func
  }

  static wrap(object, key, wrapper) {
    const map = getOrCreateMap(object, key)

    if (typeof map.wrappers[esmVersion] !== "function") {
      map.versions.push(esmVersion)
      map.wrappers[esmVersion] = wrapper
    }
  }
}

function createMap(object, key) {
  const map = new FastObject
  map.raw = Wrapper.unwrap(object, key)
  map.versions = []
  map.wrappers = new FastObject

  // Store the wrapper map as object[wrapSym][key] rather than on the
  // function, so that other code can modify the same property  without
  // interfering with our wrapper logic.
  return getOrCreateStore(object)[key] = map
}

function createStore(object) {
  return object[wrapSym] = new FastObject
}

function getMap(object, key) {
  const store = getStore(object)
  return store !== null && key in store
    ? store[key]
    : null
}

function getOrCreateMap(object, key) {
  const map = getMap(object, key)
  return map === null
    ? createMap(object, key)
    : map
}

function getOrCreateStore(object) {
  const store = getStore(object)
  return store === null
    ? createStore(object)
    : store
}

function getStore(object) {
  return utils.has(object, wrapSym)
    ? object[wrapSym]
    : null
}

Object.setPrototypeOf(Wrapper.prototype, null)

module.exports = Wrapper
