"use strict";

const compile = require("../lib/compiler.js").compile;
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const path = require("path");
const utils = require("./utils.js");

// Used when compile filename argument is falsy.
// Enables in-memory caching, at least.
const fallbackPkgInfo = {
  cache: Object.create(null)
};

exports.compile = (content, options) => {
  options = Object.assign(Object.create(null), options);

  if (options.filename === "repl") {
    // Treat the REPL as if there is no filename.
    options.filename = null;
  }

  const pkgInfo = options.filename
    ? utils.getPkgInfo(options.filename)
    : fallbackPkgInfo;

  if (! pkgInfo) {
    return content;
  }

  return options.filename
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
  const json = pkgInfo ? pkgInfo.json : null;
  const reify = json ? json.reify : null;

  const cacheKey = typeof options.makeCacheKey === "function"
    ? options.makeCacheKey()
    : (options.cacheKey || content);

  const cacheFilename = utils.getCacheFilename(cacheKey, reify);

  const absCachePath = typeof pkgInfo.cacheDir === "string" &&
    path.join(pkgInfo.cacheDir, cacheFilename);

  let cacheValue = pkgInfo.cache[cacheFilename];

  if (cacheValue) {
    if (absCachePath && cacheValue === true) {
      cacheValue = pkgInfo.cache[cacheFilename] =
        utils.readFileOrNull(absCachePath);
    }

    if (typeof cacheValue === "string") {
      return cacheValue;
    }
  }

  const filename = options.filename;
  const force = !!filename && path.extname(filename) === ".mjs";
  const compileOptions = {
    ast: false,
    force
  };

  if (reify && reify.parser) {
    compileOptions.parse = dynRequire(reify.parser).parse;
  }

  const result = compile(content, compileOptions);
  const code = result.code;

  if (result.identical) {
    // Don't bother caching if the compiler made no changes.
    return content;
  }

  if (typeof pkgInfo.cacheDir === "string") {
    utils.scheduleWrite(absCachePath, code);
  }

  return pkgInfo.cache[cacheFilename] = code;
}

