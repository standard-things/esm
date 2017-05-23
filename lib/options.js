"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultOptions = {
  // If true, a "use strict" directive is added to code evaluated as an ES module.
  enforceStrictMode: true,
  generateArrowFunctions: true,
  generateLetDeclarations: false,
  modifyAST: false,
  moduleAlias: "module",
  // If true, generate code appropriate for an interactive REPL session.
  // In particular, individual commands are not  wrapped with module.run(...)
  // and options.generateLetDeclarations is false (if unspecified).
  repl: false,
  sourceType: "unambiguous",
  get parse () {
    return require("./parser").parse;
  }
};

function get(options, name) {
  if (hasOwn.call(options, name)) {
    const result = options[name];
    if (result !== void 0) {
      return result;
    }
  }

  if (name === "generateLetDeclarations" &&
      hasOwn.call(options, "repl") &&
      options.repl) {
    return false;
  }

  return defaultOptions[name];
}

exports.get = get;

function setDefaults(options) {
  Object.assign(defaultOptions, options);
}

exports.setDefaults = setDefaults;
