"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultOptions = {
  ast: false,
  // If not false, "use strict" will be added to any modules with at least
  // one import or export declaration.
  enforceStrictMode: true,
  // If true, generate code appropriate for an interactive REPL session.
  // In particular, in the REPL we should not wrap individual commands
  // with module.run(function(){...}), and options.repl also implies the
  // falsity of options.generateLetDeclarations (if unspecified).
  repl: false,
  generateArrowFunctions: true,
  generateLetDeclarations: false,
  sourceType: "unambiguous",
  moduleAlias: "module",
  get parse () {
    return require("./parsers/default.js").parse;
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
      hasOwn.call(options, "repl")) {
    // If options.generateLetDeclarations is unspecified and options.repl
    // is specified, return true iff options.repl is falsy.
    return ! options.repl;
  }

  return defaultOptions[name];
}

exports.get = get;

function setDefaults(options) {
  Object.assign(defaultOptions, options);
}

exports.setDefaults = setDefaults;
