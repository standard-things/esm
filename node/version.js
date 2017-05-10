"use strict";

const fs = require("./fs.js");
const path = require("path");
const pkgPath = path.join(__dirname, "../package.json");
const SemVer = require("semver");

module.exports = new SemVer(
  process.env.REIFY_VERSION || fs.readJSON(pkgPath).version
);
