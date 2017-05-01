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

createWrapperManager(Mp, "_compile");
createWrapperManager(exts, ".js");
createWrapperManager(exts, ".mjs");

addWrapper(Mp._compile, function(func, content, filename) {
  const options = Object.assign({ filename }, compileOptions);
  options.cacheKey = () => getCacheKey(filename);
  runtime.enable(this);
  return func.call(this, compiler.compile(content, options), filename);
});

addWrapper(exts[".js"], function(func, module, filename) {
  const pkgInfo = typeof filename === "string"
    ? utils.getPkgInfo(path.dirname(filename))
    : null;

  let cacheValue;
  const cachePath = pkgInfo === null ? null : pkgInfo.cachePath;

  if (cachePath !== null) {
    const cache = pkgInfo.cache;
    const cacheKey = getCacheKey(filename);
    const cacheFilename = utils.getCacheFilename(cacheKey, pkgInfo.config);

    cacheValue = cache[cacheFilename];
    if (cacheValue === true) {
      const cacheFilepath = path.join(cachePath, cacheFilename);
      const buffer = utils.readFile(cacheFilepath);
      cacheValue = cache[cacheFilename] = utils.gunzip(buffer, "utf8");
    }
  }

  const reified = module._compile.reified;
  const _compile = reified.raw;

  if (typeof cacheValue === "string") {
    runtime.enable(module);
    _compile.call(module, cacheValue, filename);

  } else {
    const wrapper = reified.wrappers[reifyVersion];
    wrapper.call(module, _compile, utils.readFile(filename, "utf8"), filename);
  }
  module.runModuleSetters();
});

addWrapper(exts[".mjs"], function(func, module, filename) {
  exts[".js"].reified.wrappers[reifyVersion].call(this, module, filename);
});
