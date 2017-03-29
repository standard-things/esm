"use strict";

const vm = require("vm");
const compile = require("../node/caching-compiler.js").compile;

require("../node");

function wrap(name, optionsArgIndex) {
  const method = vm[name];

  if (typeof method !== "function" ||
      method.reified) {
    return;
  }

  vm[name] = function (code) {
    const options = arguments[optionsArgIndex];
    const compileOptions = Object.create(null);
    if (options && typeof options.filename === "string") {
      compileOptions.filename = options.filename;
    }

    const args = [compile(code, compileOptions)];
    const argsCount = arguments.length;

    for (let i = 1; i < argsCount; ++i) {
      args.push(arguments[i]);
    }

    return method.apply(vm, args);
  };

  // Preserve the original method just in case anyone needs to use or
  // restore it.
  vm[name].reified = method;
}

// Enable import and export statements in the default Node REPL.
// Custom REPLs can still define their own eval functions that circumvent
// this compilation step, but that's a feature, not a drawback.
wrap("createScript", 1);
wrap("runInContext", 2);
wrap("runInNewContext", 2);
wrap("runInThisContext", 1);
