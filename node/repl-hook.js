"use strict";

const utils = require("./utils.js");

const dynModule = module.parent ? module : __non_webpack_module__;
const rootModule = utils.getRootModule(dynModule);

if (utils.isREPL(rootModule)) {
  // Enable import and export statements in the default Node REPL.
  // Custom REPLs can still define their own eval functions that circumvent this
  // compilation step, but that's a feature, not a drawback.
  const compile = require("./caching-compiler.js").compile;
  const runtime = require("./runtime.js");
  const vm = require("vm");
  const wrapper = require("./wrapper.js");

  wrapper.manage(vm, "createScript", function (func, code, options) {
    const pkgInfo = utils.getPkgInfo();
    const wrap = wrapper.find(vm, "createScript", pkgInfo.range);
    return wrap.call(this, func, pkgInfo, code, options);
  });

  wrapper.add(vm, "createScript", function (func, pkgInfo, code, options) {
    const cacheFilename = utils.getCacheFileName(null, code, pkgInfo);
    const cacheValue = pkgInfo.cache[cacheFilename];
    code = typeof cacheValue === "string"
      ? cacheValue
      : compile(code, { cacheFilename, pkgInfo, repl: true });

    return func.call(this, code, options);
  });

  runtime.enable(rootModule);
}
