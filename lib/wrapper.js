"use strict"

const esmVersion = require("./version.js").version
const FastObject = require("./fast-object.js")
const path = require("path")
const utils = require("./utils.js")

const wrapSym = Symbol.for("__esmWrapper")

function add(object, key, wrapper) {
  const map = getOrCreateMap(object, key)

  if (typeof map.wrappers[esmVersion] !== "function") {
    map.versions.push(esmVersion)
    map.wrappers[esmVersion] = wrapper
  }
}

exports.add = add

function createMap(object, key) {
  const map = new FastObject
  map.raw = getRaw(object[key])
  map.versions = []
  map.wrappers = new FastObject

  // Store the wrapper map as object[wrapSym][key] rather than on the
  // function, so that other code can modify the same property  without
  // interfering with our wrapper logic.
  return getOrCreateStore(object)[key] = map
}

exports.createMap = createMap

function createStore(object) {
  return object[wrapSym] = new FastObject
}

exports.createStore = createStore

function find(object, key, range) {
  const map = getMap(object, key)
  if (map !== null) {
    const version = utils.maxSatisfying(map.versions, range)
    if (version !== null) {
      return map.wrappers[version]
    }
  }
  return null
}

exports.find = find

function getMap(object, key) {
  const store = getStore(object)
  return store !== null && key in store
    ? store[key]
    : null
}

exports.getMap = getMap

function getRaw(func) {
  return utils.has(func, wrapSym)
    ? func[wrapSym]
    : func
}

exports.getRaw = getRaw

function getStore(object) {
  return utils.has(object, wrapSym)
    ? object[wrapSym]
    : null
}

exports.getStore = getStore

function getOrCreateStore(object) {
  const store = getStore(object)
  return store === null
    ? createStore(object)
    : store
}

exports.getOrCreateStore = getOrCreateStore

function getOrCreateMap(object, key) {
  const map = getMap(object, key)
  return map === null
    ? createMap(object, key)
    : map
}

exports.getOrCreateMap = getOrCreateMap

function manage(object, key, wrapper) {
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

exports.manage = manage
