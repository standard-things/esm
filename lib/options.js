"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultOptions = {
  ast: false,
  // If not false, "use strict" will be added to any modules with at least
  // one import or export declaration.
  enforceStrictMode: true,
  generateArrowFunctions: true,
  generateLetDeclarations: false,
  sourceType: "unambiguous",
  moduleAlias: "module",
  get parse () {
    return require("./parsers/default.js").parse;
  }
};

function get(options, name) {
  const result = hasOwn.call(options, name) ? options[name] : void 0;
  return result === void 0 ? defaultOptions[name] : result;
}

exports.get = get;

function setDefaults(options) {
  Object.assign(defaultOptions, options);
}

exports.setDefaults = setDefaults;
