"use strict";

const compile = require("../lib/compiler.js").compile;
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const path = require("path");
const utils = require("./utils.js");

const hasOwn = Object.prototype.hasOwnProperty;

// Used when compile filename argument is falsy.
// Enables in-memory caching, at least.
const fallbackPkgInfo = {
  cache: Object.create(null),
  config: Object.create(null)
};

exports.compile = (content, options) => {
  options = Object.assign(Object.create(null), options);

  if (options.filename === "repl") {
    // Treat the REPL as if there is no filename.
    options.filename = null;
  }
  const filename = options.filename;
  const hasFilename = typeof filename === "string";

  const pkgInfo = hasFilename
    ? utils.getPkgInfo(path.dirname(filename))
    : fallbackPkgInfo;

  if (pkgInfo === null) {
    return content;
  }

  return hasFilename
    ? compileWithCacheAndFilename(pkgInfo, content, options)
    : compileWithCache(pkgInfo, content, options);
};

function compileWithCacheAndFilename(pkgInfo, content, options) {
  try {
    return compileWithCache(pkgInfo, content, options);
  } catch (e) {
    e.message += " while processing file: " + options.filename;
    throw e;
  }
}

function compileWithCache(pkgInfo, content, options) {
  let cacheKey = options.cacheKey;

  if (cacheKey === void 0) {
    cacheKey = content;
  }

  const cacheFilename = utils.getCacheFilename(cacheKey, pkgInfo);
  const cacheValue = pkgInfo.cache[cacheFilename];

  if (typeof cacheValue === "string") {
    return cacheValue;
  }

  const compileOptions = {
    parse: void 0,
    sourceType: void 0
  };

  const filename = options.filename;
  const hasFilename = typeof filename === "string";
  const parser = pkgInfo.config.parser;

  if (typeof parser === "string") {
    compileOptions.parse = dynRequire(parser).parse;
  }

  if (hasFilename && path.extname(filename) === ".mjs") {
    compileOptions.sourceType = "module";
  }

  const result = compile(content, compileOptions);
  const code = result.code;

  if (result.identical) {
    // Don't bother caching if the compiler made no changes.
    return content;
  }

  if (hasFilename && typeof pkgInfo.cachePath === "string") {
    const rootPath = path.dirname(filename);
    const absolutePath = path.join(pkgInfo.cachePath, cacheFilename);
    const relativePath = path.relative(rootPath, absolutePath);
    utils.scheduleWrite(rootPath, relativePath, code);
  }

  return pkgInfo.cache[cacheFilename] = code;
}
