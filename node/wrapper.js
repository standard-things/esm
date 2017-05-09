"use strict";

const isObject = require("../lib/utils.js").isObject;
const path = require("path");
const utils = require("./utils.js");

const FastObject = require("../lib/fast-object.js");

const hasOwn = Object.prototype.hasOwnProperty;
const reifySemVer = utils.getReifySemVer();
const reifySymbol = Symbol.for("__reify");
const reifyVersion = reifySemVer.version;

function add(object, key, wrapper) {
  getOrCreateManager(object, key);
  const map = getOrCreateMap(object, key);

  if (typeof map.wrappers[reifyVersion] !== "function") {
    map.versions.push(reifyVersion);
    map.wrappers[reifyVersion] = wrapper;
  }
}

exports.add = add;

function createManager(object, key) {
  const func = object[key];
  const manager =  function (param, filename) {
    const pkgInfo = utils.getPkgInfo(path.dirname(filename));
    const wrapper = pkgInfo === null ? null : find(object, key, pkgInfo.range);

    // A wrapper should only be null for reify < 0.10.
    return wrapper === null
      ? func.call(this, param, filename)
      : wrapper.call(this, func, pkgInfo, param, filename);
  };

  manager[reifySymbol] = func;
  return object[key] = manager;
}

exports.createManager = createManager;

function createMap(object, key) {
  const map = new FastObject;
  map.raw = getRaw(object[key]);
  map.versions = [];
  map.wrappers = new FastObject;

  // Store the wrapper map as object[reifySymbol][key] rather than on the
  // function, so that other code can modify the same property  without
  // interfering with our wrapper logic.
  return getOrCreateStore(object)[key] = map;
}

exports.createMap = createMap;

function createStore(object) {
  return object[reifySymbol] = new FastObject;
}

exports.createStore = createStore;

function find(object, key, range) {
  const map = getMap(object, key);
  if (map !== null) {
    const version = utils.maxSatisfying(map.versions, range);
    if (version !== null) {
      return map.wrappers[version];
    }
  }
  return null;
}

exports.find = find;

function getManager(object, key) {
  const func = object[key];
  return typeof func === "function" && hasOwn.call(func, reifySymbol)
    ? func
    : null;
}

exports.getManager = getManager;

function getMap(object, key) {
  const store = getStore(object);
  return store !== null && key in store
    ? store[key]
    : null;
}

exports.getMap = getMap;

function getRaw(func) {
  return typeof func === "function" && hasOwn.call(func, reifySymbol)
    ? func[reifySymbol]
    : func;
}

exports.getRaw = getRaw;

function getStore(object) {
  return hasOwn.call(object, reifySymbol)
    ? object[reifySymbol]
    : null;
}

exports.getStore = getStore;

function getOrCreateManager(object, key) {
  const manager = getManager(object, key);
  return manager === null
    ? createManager(object, key)
    : manager;
}

exports.getOrCreateManager = getOrCreateManager;

function getOrCreateStore(object) {
  const store = getStore(object);
  return store === null
    ? createStore(object)
    : store;
}

exports.getOrCreateStore = getOrCreateStore;

function getOrCreateMap(object, key) {
  const map = getMap(object, key);
  return map === null
    ? createMap(object, key)
    : map;
}

exports.getOrCreateMap = getOrCreateMap;

