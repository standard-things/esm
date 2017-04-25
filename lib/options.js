"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultOptions = {
  ast: false,
  // If not false, "use strict" will be added to any modules with at least
  // one import or export declaration.
  enforceStrictMode: true,
  force: false,
  generateLetDeclarations: false,
  get parse () {
    return require("./parsers/default.js").parse;
  }
};

exports.get = function (options, name) {
  const result = hasOwn.call(options, name) ? options[name] : undefined;
  return typeof result === "undefined" ? defaultOptions[name] : result;
};
