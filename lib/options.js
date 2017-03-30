"use strict";

const hasOwn = Object.prototype.hasOwnProperty;

const defaultCompileOptions = {
  ast: false,
  generateLetDeclarations: false,
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
