"use strict";

const path = require("path");
const SemVer = require("semver");
const FastObject = require("../lib/fast-object.js");
const isObject = require("../lib/utils.js").isObject;
const utils = require("./utils.js");
const reifySemVer = utils.getReifySemVer();
const reifyVersion = reifySemVer.version;

function addWrapper(func, wrapper) {
  const reified = func.reified;
  if (typeof reified.wrappers[reifyVersion] !== "function") {
    reified.versions.push(reifyVersion);
    reified.wrappers[reifyVersion] = wrapper;
  }
}

exports.addWrapper = addWrapper;

function createWrapperManager(object, key) {
  const func = object[key];
  if (! isManaged(func)) {
    (object[key] = function(param, filename) {
      const pkgInfo = utils.getPkgInfo(path.dirname(filename));
      const wrapper = pkgInfo === null ? null : findWrapper(object[key], pkgInfo.range);

      // A wrapper should only be null for reify < 0.10.
      return wrapper === null
        ? func.call(this, param, filename)
        : wrapper.call(this, func, pkgInfo, param, filename);
    }).reified = createWrapperMap(func);
  }
}

exports.createWrapperManager = createWrapperManager;

function createWrapperMap(func) {
  const map = new FastObject;
  map.raw = func;
  map.versions = [];
  map.wrappers = new FastObject;
  return map;
}

function findWrapper(func, range) {
  const reified = func.reified;
  const version = SemVer.maxSatisfying(reified.versions, range);
  return version === null ? null : reified.wrappers[version];
}

function isManaged(func) {
  return typeof func === "function" && isObject(func.reified);
}
