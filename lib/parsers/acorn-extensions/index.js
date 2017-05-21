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
exports.enableExportExtensions = require("./export.js").enable;
exports.enableImportExtensions = require("./import.js").enable;
exports.enableTolerance = require("./tolerance.js").enable;
