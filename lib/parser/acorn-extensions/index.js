"use strict";

function enableAll(parser) {
  Object.keys(exports).forEach((key) => {
    if (key !== "enableAll") {
      exports[key](parser);
    }
  });
}

exports.enableAll = enableAll;
exports.enableDynamicImport = require("./dynamic-import.js").enable;
exports.enableExport = require("./export.js").enable;
exports.enableImport = require("./import.js").enable;
exports.enableTolerance = require("./tolerance.js").enable;
