"use strict";

const env = require("../lib/env.js");
const fs = require("./fs.js");
const path = require("path");
const pkgPath = path.join(__dirname, "../package.json");
const SemVer = require("semver");

module.exports = new SemVer(
  env.REIFY_VERSION || fs.readJSON(pkgPath).version
);
