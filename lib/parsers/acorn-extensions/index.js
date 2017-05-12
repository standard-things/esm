"use strict";

exports.enableAll = function (parser) {
  Object.keys(exports).forEach((key) => {
    if (key !== "enableAll") {
      exports[key](parser);
    }
  });
};

exports.enableDynamicImport = require("./dynamic-import.js").enable;
exports.enableExportExtensions = require("./export.js").enable;
exports.enableTolerance = require("./tolerance.js").enable;
