"use strict";

const libCache = require("../lib/cache");
const FastObject = require("../lib/utils.js").FastObject;

// Add lib cache.
Object.assign(exports, libCache);

// Map from absolute file paths to the package info that governs them.
exports.pkgInfo = new FastObject;
