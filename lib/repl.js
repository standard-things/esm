var vm = require("vm");
var createScript = vm.createScript;
var compile = require("./compiler.js").compile;

// Enable import and export statements in the default Node REPL.
// Custom REPLs can still define their own eval functions that circumvent
// this compilation step, but that's a feature not a drawback.
vm.createScript = function (code, options) {
  return createScript.call(vm, compile(code), options);
};
