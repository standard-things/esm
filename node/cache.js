"use strict";

const libCache = require("../lib/cache");
const FastObject = require("../lib/utils.js").FastObject;

// Map from absolute file paths to the package info that governs them.
const pkgInfo = new FastObject;

// Used when compile filename argument is falsy.
// Enables in-memory caching, at least.
pkgInfo[""] = {
  cache: Object.create(null),
  config: Object.create(null)
};

Object.assign(exports, libCache);
exports.pkgInfo = pkgInfo;
