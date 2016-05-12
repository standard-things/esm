var vm = require("vm");
var compile = require("../lib/compiler.js").compile;

require("../node");

function wrap(name) {
  var method = vm[name];

  if (typeof method !== "function") {
    return;
  }

  if (method.reified) {
    return;
  }

  vm[name] = function (code) {
    var args = [compile(code)];
    for (var i = 1; i < arguments.length; ++i) {
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
wrap("createScript");
wrap("runInContext");
wrap("runInNewContext");
wrap("runInThisContext");
