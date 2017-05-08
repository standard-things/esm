"use strict";

const compile = require("../node/caching-compiler.js").compile;
const isObject = require("../lib/utils.js").isObject;
const runtime = require("../lib/runtime.js");
const setOptions = require("../node/compile-hook.js");
const vm = require("vm");

const reifySymbol = Symbol.for("__reify");

let compileOptions;

module.exports = exports = (options) => {
  if (compileOptions === void 0) {
    setOptions(compileOptions = Object.assign({}, options));
  }
};

// Enable import and export statements in the default Node REPL.
// Custom REPLs can still define their own eval functions that circumvent
// this compilation step, but that's a feature, not a drawback.
if (isObject(module.parent) && module.parent.id === "<repl>") {
  const createScript = vm.createScript;

  if (typeof createScript[reifySymbol] !== "function") {
    (vm.createScript = function (code, options) {
      code = compile(code, { compileOptions });
      return createScript.call(this, code, options);
    })[reifySymbol] = createScript;
  }
  runtime.enable(module.parent);
}
