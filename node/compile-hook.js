"use strict";

const compiler = require("./caching-compiler.js");
const isObject = require("../lib/utils.js").isObject;
const path = require("path");
const runtime = require("../lib/runtime.js");
const utils = require("./utils.js");
const wrapper = require("./wrapper.js");

const Module = require("module");
const exts = Module._extensions;

let compileOptions;

module.exports = exports = (options) => {
  if (compileOptions === void 0) {
    compileOptions = Object.assign({}, options);
  }
};

wrapper.add(exts, ".js", function(func, pkgInfo, module, filename) {
  const cachePath = pkgInfo.cachePath;
  if (cachePath === null) {
    return func.call(this, module, filename);
  }

  const isGzipped = path.extname(filename) === ".gz";
  const cache = pkgInfo.cache;
  const cacheKey = utils.mtime(filename);
  const cacheFilename = utils.getCacheFileName(filename, cacheKey, pkgInfo);

  let cacheValue = cache[cacheFilename];
  if (cacheValue === true) {
    const cacheFilepath = path.join(cachePath, cacheFilename);
    cacheValue = isGzipped
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

    const content = isGzipped
      ? utils.gunzip(utils.readFile(filename), "utf8")
      : utils.readFile(filename, "utf8");

    cacheValue = compiler.compile(content, options);
  }

  cache[cacheFilename] = cacheValue;

  runtime.enable(module);
  module._compile(cacheValue, filename);
  module.runModuleSetters();
});

const extsJsMap = wrapper.getMap(exts, ".js");
const extsJsRaw = extsJsMap.raw;
const extJsWrapper = extsJsMap.wrappers[utils.getReifySemVer()];

[".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((key) => {
  if (typeof exts[key] !== "function") {
    // Mimic the built-in Node behavior of treating files with unrecognized
    // extensions as .js.
    exts[key] = extsJsRaw;
  }

  wrapper.add(exts, key, function(func, pkgInfo, param, filename) {
    return extJsWrapper.call(this, func, pkgInfo, param, filename);
  });
});
