"use strict";

const compiler = require("./caching-compiler.js");
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const path = require("path");
const runtime = require("../lib/runtime.js");
const utils = require("./utils.js");

const FastObject = require("../lib/utils.js").FastObject;
const Module = dynRequire("module");
const SemVer = require("semver");

const exts = Module._extensions;
const Mp = Module.prototype;

let compileOptions;
const reifyVersion = utils.getReifyVersion();

module.exports = exports = (options) => {
  if (compileOptions === void 0) {
    compileOptions = Object.assign({}, options);
  }
};

function addWrapper(func, wrapper) {
  const reified = func.reified;
  if (typeof reified.wrappers[reifyVersion] !== "function") {
    reified.versions.push(reifyVersion);
    reified.wrappers[reifyVersion] = wrapper;
  }
}

function createWrapperManager(object, property) {
  const func = object[property];
  if (! isManaged(func)) {
    (object[property] = function(param, filename) {
      // A wrapper should only be null for reify < 0.9.
      const wrapper = findWrapper(object[property], filename);
      return wrapper === null
        ? func.call(this, param, filename)
        : wrapper.call(this, func, param, filename);
    }).reified = createWrapperMap(func);
  }
}

function createWrapperMap(func) {
  const map = new FastObject;
  map.raw = func;
  map.versions = [];
  map.wrappers = new FastObject;
  return map;
}

function findWrapper(func, filename) {
  const pkgInfo = typeof filename === "string"
    ? utils.getPkgInfo(path.dirname(filename))
    : null;

  if (pkgInfo !== null) {
    const reified = func.reified;
    const version = SemVer.maxSatisfying(reified.versions, pkgInfo.range);

    if (version !== null) {
      return reified.wrappers[version];
    }
  }
  return null;
}

function getCacheKey(filename) {
  const mtime = utils.mtime(filename);
  return mtime < 0 ? null : { filename, mtime };
}

function isManaged(func) {
  return typeof func === "function" &&
    typeof func.reified === "object" && func.reified !== null;
}

createWrapperManager(exts, ".js");
createWrapperManager(exts, ".mjs");

addWrapper(exts[".js"], function(func, module, filename) {
  const pkgInfo = typeof filename === "string"
    ? utils.getPkgInfo(path.dirname(filename))
    : null;

  const cachePath = pkgInfo === null ? null : pkgInfo.cachePath;

  if (cachePath === null) {
    return func.call(this, module, filename);
  }

  const cache = pkgInfo.cache;
  const cacheKey = getCacheKey(filename);
  const cacheFilename = utils.getCacheFilename(cacheKey, pkgInfo.config);

  let cacheValue = cache[cacheFilename];
  if (cacheValue === true) {
    const cacheFilepath = path.join(cachePath, cacheFilename);
    const buffer = utils.readFile(cacheFilepath);
    cacheValue = utils.gunzip(buffer, "utf8");

  } else if (typeof cacheValue !== "string") {
    const options = Object.assign({}, compileOptions);
    options.cacheKey = cacheKey;
    options.filename = filename;
    cacheValue = compiler.compile(utils.readFile(filename, "utf8"), options);
  }

  cache[cacheFilename] = cacheValue;
  runtime.enable(module);
  module._compile(cacheValue, filename);
  module.runModuleSetters();
});

addWrapper(exts[".mjs"], function(func, module, filename) {
  exts[".js"].reified.wrappers[reifyVersion].call(this, module, filename);
});
