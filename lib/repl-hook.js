"use strict";

const utils = require("./utils.js");

const dynModule = module.parent ? module : __non_webpack_module__;
const rootModule = utils.getRootModule(dynModule);
const isREPL = utils.isREPL(rootModule);
const pkgMain = isREPL ? utils.resolvePath("../index.js", rootModule) : "";

if (isREPL && rootModule.children.some((mod) => mod.filename === pkgMain)) {
  // Enable ESM in the default Node REPL by loading `@std/esm` upon entering.
  // Custom REPLs can still define their own eval functions to bypass this,
  // but that's a feature, not a drawback.
  const compile = require("./caching-compiler.js").compile;
  const Runtime = require("./runtime.js");
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

    code = utils.isObject(cacheValue)
      ? cacheValue.code
      : compile(code, { cacheFilename, pkgInfo, repl: true }).code;

    code = '"use strict";' + code;

    return func.call(this, code, options);
  });

  Runtime.enable(rootModule);
}
