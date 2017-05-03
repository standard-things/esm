"use strict";

const compiler = require("./caching-compiler.js");
const path = require("path");
const runtime = require("../lib/runtime.js");
const utils = require("./utils.js");

const FastObject = require("../lib/utils.js").FastObject;
const Module = require("module");
const SemVer = require("semver");

const exts = Module._extensions;
const Mp = Module.prototype;

let compileOptions;
const reifySemVer = utils.getReifySemVer();
const reifyVersion = reifySemVer.version;

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

function createWrapperManager(object, key) {
  const func = object[key];
  if (! isManaged(func)) {
    (object[key] = function(param, filename) {
      const pkgInfo = utils.getPkgInfo(path.dirname(filename));
      const wrapper = pkgInfo === null ? null : findWrapper(object[key], pkgInfo.range);

      // A wrapper should only be null for reify < 0.9.
      return wrapper === null
        ? func.call(this, param, filename)
        : wrapper.call(this, func, pkgInfo, param, filename);
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

function findWrapper(func, range) {
  const reified = func.reified;
  const version = SemVer.maxSatisfying(reified.versions, range);
  return version === null ? null : reified.wrappers[version];
}

function isManaged(func) {
  return typeof func === "function" &&
    typeof func.reified === "object" && func.reified !== null;
}

createWrapperManager(exts, ".js");
createWrapperManager(exts, ".mjs");

addWrapper(exts[".js"], function(func, pkgInfo, module, filename) {
  const cachePath = pkgInfo.cachePath;
  if (cachePath === null) {
    return func.call(this, module, filename);
  }

  const cache = pkgInfo.cache;
  const cacheKey = utils.mtime(filename);
  const cacheFilename = utils.getCacheFileName(filename, cacheKey, pkgInfo);

  let cacheValue = cache[cacheFilename];
  if (cacheValue === true) {
    const cacheFilepath = path.join(cachePath, cacheFilename);
    cacheValue = path.extname(cacheFilepath) === ".gz"
      ? utils.gunzip(utils.readFile(cacheFilepath), "utf8")
      : utils.readFile(cacheFilepath, "utf8");

  } else if (typeof cacheValue !== "string") {
    const options = {
      cacheFilename,
      cachePath,
      compileOptions,
      filename,
      parser: pkgInfo.config.parser
    };

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
