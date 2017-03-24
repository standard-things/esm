"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultCompileOptions = {
  generateLetDeclarations: false,
  parse: require("./parsers/default.js").parse,
  ast: false
};

exports.get = function (options, name) {
  if (options && hasOwn.call(options, name)) {
    return options[name];
  }
  return defaultCompileOptions[name];
};
