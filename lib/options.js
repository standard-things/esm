"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultCompileOptions = {
  ast: false,
  force: false,
  generateLetDeclarations: false,
  // If not false, "use strict" will be added to any modules with at least
  // one import or export declaration.
  enforceStrictMode: true,
  get parse () {
    return require("./parsers/default.js").parse;
  }
};

exports.get = function (options, name) {
  if (options && hasOwn.call(options, name)) {
    return options[name];
  }
  return defaultCompileOptions[name];
};
