"use strict";

const path = require("path");
const SemVer = require("semver");
const FastObject = require("../lib/fast-object.js");
const isObject = require("../lib/utils.js").isObject;
const utils = require("./utils.js");
const reifySemVer = utils.getReifySemVer();
const reifyVersion = reifySemVer.version;
const hasOwn = Object.prototype.hasOwnProperty;

function getSymbolForKey(key) {
  return Symbol.for("reifyWrapperMap$" + key);
}

function addWrapper(object, key, wrapper) {
  const map = ensureWrapperMap(object, key);
  if (typeof map.wrappers[reifyVersion] !== "function") {
    map.versions.push(reifyVersion);
    map.wrappers[reifyVersion] = wrapper;
  }
}

exports.addWrapper = addWrapper;

function ensureWrapperMap(object, key) {
  let map = getWrapperMap(object, key);
  if (map === null) {
    const func = object[key];
    map = createWrapperMap(func);

    object[key] = function (param, filename) {
      const pkgInfo = utils.getPkgInfo(path.dirname(filename));
      const wrapper = pkgInfo === null ? null :
        findWrapper(object, key, pkgInfo.range);

      // A wrapper should only be null for reify < 0.10.
      return wrapper === null
        ? func.call(this, param, filename)
        : wrapper.call(this, func, pkgInfo, param, filename);
    };

    // Store the wrapper map on the object rather than on the function so
    // that other code can modify the same property without interfering
    // with our wrapper logic.
    object[getSymbolForKey(key)] = map;
  }

  return map;
}

exports.ensureWrapperMap = ensureWrapperMap;

function getWrapperMap(object, key) {
  const symbol = getSymbolForKey(key);
  if (hasOwn.call(object, symbol)) {
    const map = object[symbol];
    if (isObject(map)) {
      return map;
    }
  }
  return null;
}

function createWrapperMap(func) {
  const map = new FastObject;
  map.raw = func;
  map.versions = [];
  map.wrappers = new FastObject;
  return map;
}

function findWrapper(object, key, range) {
  const map = getWrapperMap(object, key);
  if (map !== null) {
    const version = SemVer.maxSatisfying(map.versions, range);
    if (version !== null) {
      return map.wrappers[version];
    }
  }
  return null;
}
