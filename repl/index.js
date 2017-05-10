"use strict";

const compile = require("../node/caching-compiler.js").compile;
const isObject = require("../lib/utils.js").isObject;
const runtime = require("../lib/runtime.js");
const setOptions = require("../node/compile-hook.js");
const utils = require("../node/utils.js");
const vm = require("vm");
const wrapper = require("../node/wrapper.js");

const Module = require("module");

let compileOptions;

module.exports = exports = (options) => {
  if (compileOptions === void 0) {
    setOptions(compileOptions = Object.assign({}, options));
  }
};

// Enable import and export statements in the default Node REPL.
// Custom REPLs can still define their own eval functions that circumvent this
// compilation step, but that's a feature, not a drawback.
if (module.parent instanceof Module &&
    module.parent.filename === null &&
    module.parent.id === "<repl>" &&
    module.parent.loaded === false &&
    module.parent.parent === void 0) {

  wrapper.manage(vm, "createScript", function (func, code, options) {
    const pkgInfo = utils.getPkgInfo();
    const wrap = wrapper.find(vm, "createScript", pkgInfo.range);
    return wrap.call(this, func, pkgInfo, code, options);
  });

  wrapper.add(vm, "createScript", function(func, pkgInfo, code, options) {
    const cacheFilename = utils.getCacheFileName(null, code, pkgInfo);
    const cacheValue = pkgInfo.cache[cacheFilename];
    code = typeof cacheValue === "string"
      ? cacheValue
      : compile(code, { cacheFilename, compileOptions, pkgInfo });

    return func.call(this, code, options);
  });

  runtime.enable(module.parent);
}
