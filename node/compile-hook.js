"use strict";

const compiler = require("./caching-compiler.js");
const exts = require("module")._extensions;
const fs = require("./fs.js");
const path = require("path");
const utils = require("./utils.js");
const wrapper = require("./wrapper.js");

const Runtime = require("./runtime.js");

function extManager(func, mod, filename) {
  const filePath = path.resolve(filename);
  const pkgInfo = utils.getPkgInfo(path.dirname(filePath));
  const wrap = pkgInfo === null ? null : wrapper.find(exts, ".js", pkgInfo.range);

  // A wrapper should be found for packages that opt-in to reify >= 0.10.
  return wrap === null
    ? func.call(this, mod, filePath)
    : wrap.call(this, func, pkgInfo, mod, filePath);
}

function extWrap(func, pkgInfo, mod, filePath) {
  const cachePath = pkgInfo.cachePath;

  if (cachePath === null) {
    return func.call(this, mod, filePath);
  }

  const cache = pkgInfo.cache;
  const cacheKey = fs.mtime(filePath);
  const cacheFilename = utils.getCacheFileName(filePath, cacheKey, pkgInfo);

  let cacheValue = cache[cacheFilename];
  let codeFilePath = cacheValue === true
    ? path.join(cachePath, cacheFilename)
    : filePath;

  let code = path.extname(filePath) === ".gz"
    ? fs.gunzip(fs.readFile(codeFilePath), "utf8")
    : fs.readFile(codeFilePath, "utf8");

  if (! utils.isObject(cacheValue)) {
    cacheValue = cacheValue === true
      ? { ast: null, code, identical: false, sourceType: "module" }
      : compiler.compile(code, { cacheFilename, cachePath, filePath, pkgInfo });
  }

  const isModule = cacheValue.sourceType === "module";
  cache[cacheFilename] = cacheValue;
  code = cacheValue.code;

  if (isModule) {
    code = 'module.run(function(){"use strict";' + code + "\n})";
    Runtime.enable(mod);
  }

  mod._compile(code, filePath);

  if (! isModule) {
    mod.loaded = true;
    Runtime.prototype.runSetters.call(mod);
  }
}

wrapper.manage(exts, ".js", extManager);
wrapper.add(exts, ".js", extWrap);

const extsJs = wrapper.getMap(exts, ".js").raw;

[".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((key) => {
  if (typeof exts[key] !== "function") {
    // Mimic the built-in Node behavior of treating files with unrecognized
    // extensions as .js.
    exts[key] = extsJs;
  }
  wrapper.manage(exts, key, extManager);
  wrapper.add(exts, key, extWrap);
});
