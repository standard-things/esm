"use strict";

const compiler = require("./caching-compiler.js");
const path = require("path");
const utils = require("./utils.js");

const Module = require("./runtime.js").Module;
const exts = Module._extensions;
const Mp = Module.prototype;

let compileOptions;

module.exports = exports = (options) => {
  if (typeof compileOptions === "undefined") {
    compileOptions = Object.assign({}, options);
  }
};

function getCacheKey(filename) {
  const mtime = utils.mtime(filename);
  if (mtime === -1) {
    return null;
  }
  return {
    filename,
    mtime,
    source: "Module.prototype._compile"
  };
}

// Override Module.prototype._compile to compile any code that will be
// evaluated as a module.
const _compile = Mp._compile;
if (! _compile.reified) {
  (Mp._compile = function (content, filename) {
    const options = {
      filename,
      cacheKey() {
        return getCacheKey(filename);
      }
    };

    content = compiler.compile(content, Object.assign(options, compileOptions));
    return _compile.call(this, content, filename);
  }).reified = _compile;
}

const extJs = exts[".js"];
if (! (extJs && extJs.reified)) {
  (exts[".js"] = (module, filename) => {
    const pkgInfo = typeof filename === "string"
      ? utils.getPkgInfo(path.dirname(filename))
      : null;

    const cachePath = pkgInfo !== null ? pkgInfo.cachePath : null;
    if (typeof cachePath === "string") {
      const cache = pkgInfo.cache;
      const cacheKey = getCacheKey(filename);
      const cacheFilename = utils.getCacheFilename(cacheKey, pkgInfo.config);

      let cacheValue = cache[cacheFilename];
      if (cacheValue === true) {
        const cacheFilepath = path.join(cachePath, cacheFilename);
        const buffer = utils.readFile(cacheFilepath);
        cacheValue = cache[cacheFilename] = utils.gunzip(buffer, "utf8");
      }
      if (typeof cacheValue === "string") {
        return module._compile(cacheValue, filename);
      }
    }
    return extJs(module, filename);
  }).reified = extJs;
}

const extMjs = exts[".mjs"];
if (! (extMjs && extMjs.reified)) {
  (exts[".mjs"] = (module, filename) =>
    exts[".js"](module, filename)
  ).reified = extMjs;
}
