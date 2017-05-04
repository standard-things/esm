"use strict";

const FastObject = require("../lib/utils.js").FastObject;

// Map absolute file paths to the package info that governs them.
const pkgInfo = new FastObject;

// Enable in-memory caching when compiling without a filename.
pkgInfo[""] = {
  cache: Object.create(null),
  config: Object.create(null)
};

exports.pkgInfo = pkgInfo;
