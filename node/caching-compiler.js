"use strict";

const compile = require("../lib/compiler.js").compile;
const data = require("./data.js");
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const path = require("path");
const utils = require("./utils.js");

exports.compile = (content, options) => {
  options = Object.assign({}, options);
  return typeof options.filename === "string"
    ? compileWithFilename(content, options)
    : compileAndCache(content, options);
};

function compileWithFilename(content, options) {
  try {
    return compileAndWrite(content, options);
  } catch (e) {
    e.message += " while processing file: " + options.filename;
    throw e;
  }
}

function compileAndCache(content, options) {
  const pkgInfo = data.pkgInfo[""];
  const cacheFilename = utils.getCacheFileName(null, content, pkgInfo);
  const cacheValue = pkgInfo.cache[cacheFilename];

  if (typeof cacheValue === "string") {
    return cacheValue;
  }

  const result = compile(content, toCompileOptions(options));
  return pkgInfo.cache[cacheFilename] = result.code;
}

function compileAndWrite(content, options) {
  const result = compile(content, toCompileOptions(options));

  if (! result.identical) {
    // Only cache if the compiler made changes.
    const rootPath = path.dirname(options.filename);
    const absolutePath = path.join(options.cachePath, options.cacheFilename);
    const relativePath = path.relative(rootPath, absolutePath);
    utils.scheduleWrite(rootPath, relativePath, result.code);
  }

  return result.code;
}

function toCompileOptions(options) {
  const compileOptions = {
    parse: void 0,
    sourceType: void 0
  };

  if (typeof options.parser === "string") {
    compileOptions.parse = dynRequire(options.parser).parse;
  }

  if (typeof options.filename === "string") {
    let ext = path.extname(options.filename);

    if (ext === ".gz") {
      ext = path.extname(path.basename(options.filename, ext));
    }

    if (ext === ".mjs") {
      compileOptions.sourceType = "module";
    }
  }

  return Object.assign(compileOptions, options.compileOptions);
}
