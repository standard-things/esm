"use strict";

const path = require("path");
const utils = require("./utils.js");

const FastObject = require("../lib/fast-object.js");

const hasOwn = Object.prototype.hasOwnProperty;
const reifySymbol = Symbol.for("__reifyWrapper");
const reifyVersion = require("./version.js").version;

function add(object, key, wrapper) {
  const map = getOrCreateMap(object, key);

  if (typeof map.wrappers[reifyVersion] !== "function") {
    map.versions.push(reifyVersion);
    map.wrappers[reifyVersion] = wrapper;
  }
}

exports.add = add;

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

function manage(object, key, wrapper) {
  const func = object[key];
  const manager = function () {
    const args = [func];
    const argCount = arguments.length + 1;

    for (let i = 1; i < argCount; ++i) {
      args[i] = arguments[i - 1];
    }
    return wrapper.apply(this, args);
  };

  manager[reifySymbol] = func;
  object[key] = manager;
}

exports.manage = manage;
